# 变量值

## ORIGINS_CN (国内用户的“尝试顺序表”)： 
当访问者在中国大陆（request.cf.country === "CN"）时，Worker 会按这个列表的顺序依次尝试这些源站
https://edgeone.blog.dmsoul.com,https://pages.blog.dmsoul.com,https://vercel.blog.dmsoul.com

## ORIGINS_INTL (国外用户的“尝试顺序表”)：
当访问者不是 CN（比如 HK / US / EU / JP）时，用这个顺序表
https://pages.blog.dmsoul.com,https://edgeone.blog.dmsoul.com,https://vercel.blog.dmsoul.com

## ORIGIN_TIMEOUT_MS (每个源站最多等多久)：3000
Worker 在访问每一个源站时，最多等多少毫秒

这样国内用户一般会先走 EdgeOne；EdgeOne 挂/慢就回退 Pages；再不行回退 Vercel。
