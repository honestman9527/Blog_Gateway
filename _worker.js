export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const country = request.cf?.country || "XX";

    // 读取环境变量
    const timeoutMs = parseInt(env.ORIGIN_TIMEOUT_MS || "3000", 10);
    const failStatusMin = parseInt(env.FAIL_STATUS_MIN || "500", 10);

    // 解析源站列表：用逗号分隔
    const listCN = parseOrigins(env.ORIGINS_CN);
    const listINTL = parseOrigins(env.ORIGINS_INTL);

    // 选用哪套列表
    const origins = (country === "CN" ? listCN : listINTL);

    if (!origins.length) {
      return new Response("No origins configured", { status: 500 });
    }

    // 依次尝试：第一个是首选，后面是回退
    let lastErr = null;
    for (const originBase of origins) {
      try {
        const resp = await fetchViaOrigin(request, originBase, timeoutMs);

        // 认为 5xx（或你设定的阈值）需要回退
        if (resp.status >= failStatusMin) {
          // 可选：把失败源标记一下，方便你在响应里排查（需要的话取消注释）
          // return annotate(resp, `origin=${originBase}; country=${country}; fallback=0`);
          continue;
        }

        // 成功：可选加一个 header 方便你调试到底走了哪个源
        return annotate(resp, `origin=${originBase}; country=${country}`);
      } catch (e) {
        lastErr = e;
        continue;
      }
    }

    return new Response(
      `All origins failed. country=${country}. lastErr=${String(lastErr)}`,
      { status: 502 }
    );

    // ---- helpers ----

    function parseOrigins(s) {
      return (s || "")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean)
        // 去重，保持顺序
        .filter((v, i, a) => a.indexOf(v) === i);
    }

    async function fetchViaOrigin(request, originBase, timeoutMs) {
      const origin = new URL(originBase);

      // 用原始请求的 path/query，但 host 改成源站 host
      const targetUrl = new URL(request.url);
      targetUrl.protocol = "https:";
      targetUrl.host = origin.host;

      // 复制 request（保留 method/headers/body 等）
      const newReq = new Request(targetUrl.toString(), request);

      // 明确 Host（有的平台依赖 Host 路由；有些运行时会忽略，但设了不亏）
      const headers = new Headers(newReq.headers);
      headers.set("Host", origin.host);

      // 可选：避免某些源站对压缩/缓存行为不一致（不想动就删掉这一段）
      // headers.set("Accept-Encoding", "gzip, br");

      const req2 = new Request(newReq, { headers });

      // 超时控制
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);

      try {
        return await fetch(req2, { signal: controller.signal });
      } finally {
        clearTimeout(t);
      }
    }

    function annotate(resp, value) {
      // 注意：Response headers 需要 clone 才能改
      const newHeaders = new Headers(resp.headers);
      newHeaders.set("x-origin-route", value);
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: newHeaders
      });
    }
  }
};
