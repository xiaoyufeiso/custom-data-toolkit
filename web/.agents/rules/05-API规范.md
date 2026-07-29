# 05 API规范

## 基本原则

- 所有接口请求统一基于共享请求层封装
- 不允许在组件内部直接散写 `axios` 调用
- 每个业务域单独维护自己的 API 文件

## 目录约束

```text
shared/services/     # 通用请求层（请求封装、拦截器、基础 client）
views/xxx/services/  # 业务域私有接口
```

## 请求层要求

- 统一 axios 实例
- 统一鉴权处理
- 统一错误处理
- 统一响应解包
- 统一埋点和日志接入点


## 禁止项

- 禁止页面组件直接拼请求参数细节
- 禁止多个页面重复写同一个接口封装
- 禁止接口返回值不定义类型直接透传

## 约束案例

### ✅ 正确：统一请求层 + 独立 API 文件

```ts
import request from '@/shared/utils/request';
```

```ts
// views/home/services/index.ts — 业务域接口
import request from '@/shared/utils/request';
import config from '@/config';
import type { TradeSearchParams, TradeListDTO } from '../types';

export function fetchTradeList(params: TradeSearchParams): Promise<TradeListDTO> {
  return request.post(`${config.bizr}/${config.apiVersion}/trade/search`, params);
}
```

```ts
// views/tradeSearch/hooks/useTradeList.ts — SWR hook
import useSWR from 'swr';
import { fetchTradeList } from '../services';
import type { TradeSearchParams } from '../types';

export function useTradeList(params: TradeSearchParams) {
  return useSWR(['trade-list', params], () => fetchTradeList(params));
}
```

### ❌ 错误：组件内直接写 axios 调用

```tsx
// 页面组件内直接散写请求，无统一拦截、无类型
const TradeSearchPage: React.FC = () => {
  useEffect(() => {
    axios.post('/api/trade/search', {
      country: 'US',
      page: 1,
    }).then((res) => {
      setData(res.data.data); // 无类型、无错误处理
    });
  }, []);
};
```

### ❌ 错误：多个页面重复封装同一接口

```ts
// pages/home/index.tsx
const fetchTrade = () => axios.post('/api/trade/search', params);

// pages/about/index.tsx
const getTradeData = () => axios.post('/api/trade/search', params); // 重复！
```

### ✅ 正确：DTO → ViewModel 转换分离

```ts
// views/tradeSearch/utils/transform.ts
import type { TradeItemDTO, TradeItemViewModel } from '../types';

export function toTradeViewModel(dto: TradeItemDTO): TradeItemViewModel {
  return {
    id: dto.id,
    amount: Number(dto.trade_amount),
    countryName: getCountryName(dto.country_code),
  };
}
```

### ❌ 错误：接口返回值不定义类型直接透传

```tsx
// 无类型定义，直接使用 res.data
const res = await fetchTradeList(params);
const list = res.data.map((item: any) => item); // any 透传
```
