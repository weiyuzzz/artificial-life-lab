# Project Guidance

## User Preferences

- Dark scientific laboratory and futuristic ecosystem simulator style; not cartoonish and not a card-stacked admin layout
- Simulation runs in the browser; the backend only persists data
- Never present fake data as simulation results
- Desktop first, mobile compatible
- Bilingual Chinese and English interface with a toggle

## Accepted Requirements

- 真实可运行的人工生命模拟引擎，生物自主觅食、捕猎、逃跑、繁殖和死亡
- 基因组和可遗传的神经网络驱动行为，带继承与突变
- 画布缩放、平移、选中、悬停，可开关轨迹和感知范围
- 生物观察器、种群仪表盘、动态图表、进化时间线
- 环境参数调整和五个实验事件
- 实验保存、快照、种子复现、导入导出（CSV/JSON）和两次实验对比
- 暂停、继续、单步执行，1x/2x/5x/10x/25x 速度，快速模拟指定周期
- 中英双语界面切换
- Internet Identity 登录，实验仅自己可见，新用户经管理员批准后才能保存

## Verified Commands

- **typecheck**: `cd src/frontend && pnpm typecheck`
- **fix**: `cd src/frontend && pnpm fix; cd src/backend && mops check --fix`
- **build**: `cd src/backend && mops build; pnpm bindgen`

## Learnings

- Simulation engine lives in src/frontend/src/engine with zustand store src/frontend/src/store/useSimStore.ts; the loop auto-starts on load.
- ParamsTable and EnvironmentPanel fall back to raw param keys or composed labels for some environment params; add dedicated i18n keys when touching bilingual coverage.
- useApprovalStatus briefly reads notApproved while the actor is being created because disabled queries report isLoading false.
- Default UI language is Chinese; e2e flows switch to English with the EN toggle in the header.
