# Tegri Motors вэбсайт ба CRM: суулгах заавар

Репод 2 хавтас байна:
- `crm/`: Apps Script-ийн шинэ код. Лид, машин, банк, зураг оруулах бүгд энд.
- `website/`: вэбсайтын файлууд (Render байршуулна).

## 1. CRM-ийн кодыг шинэчлэх (10 мин)
1. CRM-ийн Google Sheet → **Extensions → Apps Script** нээнэ.
2. `Code.gs` доторх кодыг бүхэлд нь устгаад `crm/Code.gs`-ийн агуулгыг хуулж тавина.
3. Зүүн талын **+ → Script** дарж `Catalog` нэртэй файл үүсгэнэ. Дотор нь `crm/Catalog.gs`-ийн агуулгыг тавина.
4. `Index.html` файлын агуулгыг `crm/Index.html`-ээр сольно.
5. Хадгалаад (Ctrl+S) дээд талын функцын жагсаалтаас **setupCatalog**-ийг сонгоод **Run** дарна. Эрх асуувал зөвшөөрнө (Drive-д зураг хадгалах эрх нэмэгдсэн).
   - Sheet дээр **Машинууд**, **Банкууд** хуудас үүснэ.
   - Drive дээр **Tegri вэбсайт зураг** хавтас үүснэ.
6. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. Энэ нь гишүүдийн CRM ("User accessing").

## 2. Вэбсайтад зориулсан нийтийн холбоос (5 мин)
1. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
2. **Deploy** дараад гарсан `.../exec` холбоосыг хуулна.
3. `website/assets/config.js` файлын `API: ''` гэсэн хэсэгт тэр холбоосыг тавина:
   `API: 'https://script.google.com/macros/s/XXXX/exec',`
4. Шалгах: тэр холбоосын ард `?api=site` нэмээд хөтөч дээр нээвэл машин, банкны JSON гарч ирнэ.

> CRM-ийн кодыг дараа өөрчлөх бүрт 2 deployment-ийг хоёуланг нь **New version** болгож шинэчилнэ.

## 3. Render дээр байршуулах (5 мин)
1. dashboard.render.com → **New → Blueprint** → энэ `tegri-website` репог сонгоно. `render.yaml` уншигдаж Static Site автоматаар үүснэ (publish хавтас нь `website`).
   - Эсвэл **New → Static Site** → репо → Publish directory: `website`, Build command хоосон.
2. `tegri-website.onrender.com` хаяг гарна. Утсаараа нээж, форм илгээж шалгана.
3. GitHub-д өөрчлөлт push хийх бүрт Render автоматаар шинэчилнэ.

## 4. tegrimotors.mn домэйн холбох (Datacom)
1. Render → сайт → **Settings → Custom Domains** → `tegrimotors.mn` болон `www.tegrimotors.mn` нэмнэ.
2. domain.mn → DNS тохиргоо (Render-ийн харуулсан утгыг давхар шалгаарай):

| Төрөл | Нэр | Утга |
|---|---|---|
| A | @ (хоосон) | 216.24.57.1 |
| CNAME | www | tegri-website.onrender.com |

3. Render дээр **Verify** дарна. HTTPS автоматаар асна (1–24 цаг).
4. Хуучин A/CNAME бичлэг байвал устгана. **MX бичлэгт хүрэхгүй**, тэгвэл info@ имэйл тасарна.

## Өдөр тутам
- **Машинууд** табаас үнэ, төлөв, зураг, үзүүлэлт, PDF засна.
- **Банкууд** табаас хүү, урьдчилгаа, хугацаа, логог засна.
- Хадгалсны дараа сайт 5 минутын дотор шинэчлэгдэнэ.
- Зургийг CRM өөрөө жижигрүүлж оруулна. Хэмжээ нь «Зураг бэлтгэх заавар»-т бий.
- Сайтын файлыг (текст, дизайн) өөрчилбөл GitHub-д push хийхэд Render автоматаар шинэчилнэ.
