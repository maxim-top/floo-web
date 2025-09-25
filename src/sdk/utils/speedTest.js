import log from './log';
const speedTest = (endpoints, path = '/api/health', gapMs = 2000, timeoutMs = 10000) => {
  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    return Promise.reject(new Error('endpoints 不能为空'));
  }
  if (endpoints.length === 1) {
    return Promise.resolve(endpoints[0]);
  }

  let resolved = false; // 是否已找到可用 endpoint
  const controllers = []; // 保存已发起请求的 AbortController

  const fetchWithTimeout = (url, timeout) =>
    new Promise((resolve, reject) => {
      const controller = new AbortController();
      controllers.push(controller);
      const id = setTimeout(() => {
        controller.abort();
        reject(new Error('Timeout'));
      }, timeout);

      fetch(url, { signal: controller.signal })
        .then((res) => {
          clearTimeout(id);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(id);
          reject(err);
        });
    });

  return new Promise((resolve, reject) => {
    let started = 0;
    const total = endpoints.length;
    let finished = 0;

    const tryNext = () => {
      if (resolved || started >= total) return;

      const idx = started;
      const url = endpoints[idx].replace(/\/+$/, '') + path;
      const endpoint = endpoints[idx];
      started++;

      const startTime = Date.now();
      // ✅ 触发请求时打印日志
      log.info(`SpeedTest start ${endpoint}`);

      fetchWithTimeout(url, timeoutMs)
        .then((res) => {
          if (resolved) return;
          if (res.status === 200) {
            resolved = true;
            const timeTaken = Date.now() - startTime;
            log.info(`SpeedTest success ${endpoint} in ${timeTaken} ms`);
            controllers.forEach((c) => c.abort()); // 中断其他请求
            resolve(endpoint);
          }
        })
        .catch(() => {
          // ignore
        })
        .finally(() => {
          finished++;
          if (!resolved && finished === total) {
            reject(new Error('NoAvailableEndpoint'));
          }
        });

      if (!resolved && started < total) {
        setTimeout(() => {
          tryNext();
        }, gapMs);
      }
    };

    tryNext();
  });
};

const tryUrlsWithTimeout = (urls, fn, gapMs = 1000, timeoutMs = 20000) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    return Promise.reject({ code: 'NO_URLS', message: 'urls 不能为空' });
  }

  if (urls.length === 1) {
    return withTimeout(fn(urls[0]), timeoutMs);
  }

  let resolved = false;
  let failCount = 0;
  let lastError = null;

  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject({ code: 'TIMEOUT', message: 'timeout' }), ms);

      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
            reject(err); // 遇到 { code, message } 立即 reject
          } else {
            reject(err); // 普通错误
          }
        });
    });
  }

  return new Promise((resolve, reject) => {
    urls.forEach((url, index) => {
      setTimeout(() => {
        if (resolved) return;

        withTimeout(fn(url), timeoutMs)
          .then((res) => {
            if (!resolved) {
              resolved = true;
              resolve(res);
            }
          })
          .catch((err) => {
            if (!resolved) {
              if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
                resolved = true;
                reject(err); // { code, message } 立即 reject
              } else {
                lastError = err;
                failCount++;
                if (failCount === urls.length) {
                  resolved = true;
                  reject(lastError); // 全部普通错误才 reject
                }
              }
            }
          });
      }, index * gapMs);
    });
  });
};

export { speedTest, tryUrlsWithTimeout };
