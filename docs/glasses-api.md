# 眼镜对接网站说明（给姐姐）

更新：2026-11-27（第二版：加了 Mia、厨房、紧急步骤）

网站这边已经做好了。眼镜按下面的格式发消息，护士台网页会马上响；护士按「马上到」以后，眼镜可以读到回复。

## 一句话
眼镜 → `POST /api/glasses/events` 发消息；眼镜每 5 秒 `GET /api/glasses/events?since=上次时间` 拿回复和别人叫你的消息。

## 基本信息

| 项目 | 内容 |
|---|---|
| 网址 | `https://agecare-1.onrender.com`（本地测试用 `http://localhost:3000`） |
| 密钥 | 每个请求都要带请求头 `Authorization: Bearer <密钥>`。还没在 Render 设 `GLASSES_TOKEN` 时，用示范密钥 `sunrise-demo` |
| 格式 | JSON，`Content-Type: application/json` |
| 房间 | 网页版的示范老人是 3、5、8、12 号房（3 王奶奶、5 陳伯、8 陳婆婆、12 李婆婆），和眼镜的房号一样。**请发 `room`**，网站会自动对上老人 |
| 注意 | 免费服务器没人用时会睡着，第一次请求可能要等 30–60 秒。服务器重启后消息会清空（示范版存在内存里） |

> Rokid 文档说不支持局域网，这个网址是公网 HTTPS，应该可以直接用；如果 AIUI 要求登记域名，请在后台登记 `agecare-1.onrender.com`。

## 1. 发消息：`POST /api/glasses/events`

| 字段 | 必填 | 说明 |
|---|---|---|
| `type` | 是 | `call` 叫人、`emergency` 紧急、`meal` 餐盘、`note` 护理记录、`moment` 记一笔 |
| `text` | 是（有照片时可空） | 一句话，例如「老人说头晕，想请护士来看看」 |
| `from` | 建议 | 护工名字，例如 `Jane` |
| `to` | 叫人时 | 叫谁：`["nurse"]`、`["manager"]`、`["Anna"]`、`["kitchen"]`，可以几个。紧急不填时默认 `["nurse","manager"]`。网站没有厨房，`kitchen` 的消息由护士收，护士台会标「发给厨房，护士代收」 |
| `room` | 建议 | 房号，例如 `"3"` |
| `resident` | 可选 | 老人名字（没有 room 时用） |
| `urgent` | 可选 | `true` 会标红 |
| `photo` | 可选 | `data:image/jpeg;base64,...`，请压缩到 1 MB 以内（宽 1024 左右） |
| `data` | 可选 | 附加资料。餐盘建议发 `{"percentEaten":40,"kcalEstimate":210,"flags":["含鸡蛋"]}`，紧急可以发 `{"kind":"fall","step":3}` |
| `deviceId` | 可选 | 眼镜编号 |

成功会返回：`{"id":"Gxxxx","at":"13:01","ts":1795744874498}`，**请记住 `id`**，用来查回复。

例子（叫护士）：
```bash
curl -X POST https://agecare-1.onrender.com/api/glasses/events \
  -H "Authorization: Bearer sunrise-demo" -H "Content-Type: application/json" \
  -d '{"type":"call","from":"Jane","to":["nurse"],"room":"3","text":"老人说头晕，想请护士来看看"}'
```

例子（紧急）：
```json
{"type":"emergency","from":"Jane","room":"8","text":"陳婆婆在浴室摔倒了","data":{"kind":"fall","step":1}}
```

例子（餐盘）：
```json
{"type":"meal","from":"Jane","room":"3","text":"午餐吃了不到一半，青菜没动。","photo":"data:image/jpeg;base64,...","data":{"percentEaten":40,"kcalEstimate":210,"flags":[]}}
```

## 2. 查回复和新消息：`GET /api/glasses/events?since=<毫秒时间>`
返回在 `since` 之后**新建或有人回复**的消息（不含照片，比较小）：
```json
{"now":1795744900000,"events":[
  {"id":"Gxxxx","type":"call","from":"Jane","to":["nurse"],"room":"3","text":"...",
   "replies":[{"by":"Priya","at":"13:01","kind":"coming"}],"closed":false, "source":"glasses"}
]}
```
- 下次把 `since` 设成这次返回的 `now`。
- `replies` 里 `kind: "coming"` = 马上到，`"done"` = 已处理（这时 `closed` 变 `true`）。
- **别人叫你**：找 `source` 是 `"web"`、`to` 里有这位护工名字的消息，眼镜念出来就行。网页「叫人」里已经有「护工 Mia（戴眼镜）」，选了就是 `to: ["Mia"]`。

只查一条：`GET /api/glasses/events/<id>`。

## 3. 眼镜回复别人：`POST /api/glasses/events/<id>/reply`
```json
{"by":"Jane","kind":"coming"}
```
`kind` 用 `coming`（马上到）或 `done`（已处理）。护工点头回「马上到」时调用这个。

**紧急换步骤**也用这个接口，只带 `step`（可加总步数 `steps`），不带 `kind`：
```json
{"by":"Mia","step":3,"steps":6}
```
这样不会算成一条回复，只会更新步骤；护士台在这条紧急下面显示「眼镜：第 3 步，共 6 步」。

## 建议的眼镜流程
1. 叫护士、紧急、拍餐盘时，`POST` 一条，记下 `id`。
2. 每 5 秒 `GET ?since=`：
   - 自己发的消息有新回复 → 念出「Priya 马上到」。
   - 有 `to` 是自己的新消息 → 念出「Anna 叫你：5 号房陳伯，要两个人扶」，点头就 `reply coming`。
3. 网络失败时先存在眼镜本地，恢复后再发。

## 网站那边看到什么
- 护士台（`/station`）：叫人和紧急会响、标红，旁边写「来自眼镜」，护士按「马上到」。
- 老人面板（`/residents`）：餐盘照片、护理记录、记一笔会进这位老人的时间线，带照片。
- 交班单：目前还没有自动收眼镜的消息，下一步可以接。

## 已确认（11-27 姐姐回复）
1. 写记录继续用 `/api/agent/run`；叫人、紧急、餐盘用 `/api/glasses/events`。
2. 护士页面以网站的 `/station` 为准，眼镜那边的补丁不合并。
3. Jane 在 Render 设好 `GLASSES_TOKEN` 后告诉姐姐，眼镜改 `WEB_TOKEN` 一行。

## 还没定的
- 老人名字：网站是 3 王奶奶、5 陳伯、8 陳婆婆、12 李婆婆；眼镜是 W 太太、K 先生、L 太太、H 先生。房号一样，所以消息能对上，只是演示时屏幕上名字不同。
