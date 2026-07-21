from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "admin-guide" / "images"
WIDTH = 1400
HEIGHT = 900

COLORS = {
    "bg": "#f4f7fb",
    "navy": "#0b2a5b",
    "blue": "#1479d6",
    "line": "#d7e1ee",
    "muted": "#52647a",
    "panel": "#ffffff",
    "green": "#0f9f6e",
    "amber": "#d97706",
    "red": "#dc2626",
}


def font(size, bold=False):
    font_name = "arialbd.ttf" if bold else "arial.ttf"
    font_path = Path("C:/Windows/Fonts") / font_name
    if font_path.exists():
        return ImageFont.truetype(str(font_path), size)
    return ImageFont.load_default()


FONT_TITLE = font(42, True)
FONT_H2 = font(27, True)
FONT_BODY = font(22)
FONT_SMALL = font(18)
FONT_TINY = font(15, True)


def rounded(draw, box, fill, outline=None, width=1, radius=18):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text_box(draw, xy, text, fill, font_obj, max_chars, line_gap=6):
    x, y = xy
    for line in text.split("\n"):
        chunks = wrap(line, max_chars) or [""]
        for chunk in chunks:
            draw.text((x, y), chunk, fill=fill, font=font_obj)
            y += font_obj.size + line_gap
    return y


def callout(draw, number, title, body, xy, color=COLORS["blue"], width=390):
    x, y = xy
    rounded(draw, (x, y, x + width, y + 128), COLORS["panel"], COLORS["line"], 2, 18)
    draw.ellipse((x + 16, y + 18, x + 54, y + 56), fill=color)
    draw.text((x + 35, y + 37), str(number), fill="white", font=FONT_TINY, anchor="mm")
    draw.text((x + 66, y + 17), title, fill=COLORS["navy"], font=FONT_SMALL)
    text_box(draw, (x + 66, y + 47), body, COLORS["muted"], FONT_SMALL, 34, 4)


def arrow(draw, start, end, color=COLORS["blue"]):
    draw.line((start, end), fill=color, width=5)
    ex, ey = end
    sx, sy = start
    dx = 1 if ex >= sx else -1
    dy = 1 if ey >= sy else -1
    draw.polygon([(ex, ey), (ex - dx * 20, ey - dy * 8), (ex - dx * 8, ey - dy * 22)], fill=color)


def draw_shell(draw, title, subtitle):
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=COLORS["bg"])
    rounded(draw, (60, 46, WIDTH - 60, 142), COLORS["panel"], COLORS["line"], 2, 26)
    draw.text((92, 68), title, fill=COLORS["navy"], font=FONT_TITLE)
    draw.text((94, 116), subtitle, fill=COLORS["muted"], font=FONT_SMALL)
    nav_items = ["Dashboard", "Search", "Leads", "Schedule", "Tech", "Invoices", "Parts", "Accounting"]
    x = 76
    for item in nav_items:
        pill_w = 98 if len(item) < 6 else 132
        rounded(draw, (x, 164, x + pill_w, 206), COLORS["panel"], COLORS["line"], 1, 20)
        draw.text((x + pill_w / 2, 185), item, fill=COLORS["navy"], font=FONT_TINY, anchor="mm")
        x += pill_w + 12


def draw_card(draw, box, title, body, accent=COLORS["blue"]):
    rounded(draw, box, COLORS["panel"], COLORS["line"], 2, 22)
    x1, y1, _, _ = box
    draw.rectangle((x1, y1, x1 + 8, y1 + 88), fill=accent)
    draw.text((x1 + 28, y1 + 22), title, fill=COLORS["navy"], font=FONT_H2)
    text_box(draw, (x1 + 28, y1 + 61), body, COLORS["muted"], FONT_SMALL, 42, 4)


def page_dashboard():
    img = Image.new("RGB", (WIDTH, HEIGHT), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    draw_shell(draw, "Admin: Dashboard", "Main overview for today's jobs, money, parts, and reminders.")
    labels = [
        ("Jobs today", "scheduled visits for today", COLORS["blue"]),
        ("Need scheduling", "open invoices without date", COLORS["amber"]),
        ("Need parts", "jobs waiting on parts", COLORS["green"]),
        ("Unpaid", "open balance to collect", COLORS["red"]),
        ("Collected today", "payments received today", COLORS["blue"]),
    ]
    x = 82
    for title, body, color in labels:
        draw_card(draw, (x, 250, x + 238, 390), title, body, color)
        x += 252
    draw_card(draw, (82, 430, 646, 725), "Reminders / Needs attention", "Internal reminders: missing date, missing time, no technician, past job open, parts follow-up, unpaid follow-up.", COLORS["red"])
    draw_card(draw, (684, 430, 1318, 725), "Quick blocks", "Next jobs, Needs action, and Collect money open the right invoice or schedule page quickly.", COLORS["green"])
    callout(draw, 1, "Начинай отсюда", "Dashboard показывает, что требует внимания прямо сейчас.", (82, 760), COLORS["blue"])
    callout(draw, 2, "Кликай карточку", "Любая карточка ведет в нужный раздел CRM.", (514, 760), COLORS["green"])
    callout(draw, 3, "Reminders", "Это внутренние задачи для owner, dispatch и technician.", (946, 760), COLORS["red"])
    arrow(draw, (280, 760), (248, 390))
    arrow(draw, (1100, 760), (1020, 545), COLORS["red"])
    return img


def page_search():
    img = Image.new("RGB", (WIDTH, HEIGHT), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    draw_shell(draw, "Admin: Global Search", "Fast search across customers, phones, addresses, invoices, and parts.")
    rounded(draw, (115, 270, 1285, 345), COLORS["panel"], COLORS["line"], 2, 28)
    draw.text((150, 292), "Type name, phone, address, appliance, invoice #, part number...", fill=COLORS["muted"], font=FONT_BODY)
    draw_card(draw, (115, 405, 500, 660), "Invoices", "Find invoice records and open the invoice detail page.", COLORS["blue"])
    draw_card(draw, (525, 405, 910, 660), "Leads", "Find website requests and manual leads.", COLORS["green"])
    draw_card(draw, (935, 405, 1285, 660), "Parts", "Find parts by name, number, supplier, or linked customer.", COLORS["amber"])
    callout(draw, 1, "Один поиск", "Не нужно помнить, где находится клиент.", (115, 720), COLORS["blue"])
    callout(draw, 2, "Вводи часть", "Например последние 4 цифры телефона или улицу.", (505, 720), COLORS["green"])
    callout(draw, 3, "Результат кликабельный", "Нажал - сразу открыл нужную карточку.", (895, 720), COLORS["amber"])
    arrow(draw, (280, 720), (370, 345))
    return img


def page_leads():
    img = Image.new("RGB", (WIDTH, HEIGHT), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    draw_shell(draw, "Admin: Leads", "Website requests, phone requests, and manually created leads.")
    draw_card(draw, (90, 250, 440, 410), "Filters", "Active, Archive, All, and status filters keep the list clean.", COLORS["blue"])
    draw_card(draw, (470, 250, 840, 410), "Lead card", "Name, phone, address, appliance, problem, source, and notes.", COLORS["green"])
    draw_card(draw, (870, 250, 1270, 410), "Actions", "Call, open Maps, update status, and create invoice.", COLORS["amber"])
    draw_card(draw, (90, 470, 640, 690), "Lead detail", "Manage notes, visit date, estimate, technician, and invoice creation.", COLORS["blue"])
    draw_card(draw, (680, 470, 1270, 690), "Activity", "Timeline shows who changed the lead and when.", COLORS["red"])
    callout(draw, 1, "Новая заявка", "Сначала проверь контакт, адрес и проблему.", (90, 735), COLORS["blue"])
    callout(draw, 2, "После разговора", "Поставь статус и дату визита или создай invoice.", (505, 735), COLORS["green"])
    callout(draw, 3, "Не удалять без причины", "Удаление доступно только owner-доступу.", (920, 735), COLORS["red"])
    return img


def page_schedule():
    img = Image.new("RGB", (WIDTH, HEIGHT), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    draw_shell(draw, "Admin: Dispatch Schedule", "Day and week dispatch by time window and technician.")
    for i, label in enumerate(["8-10", "10-12", "12-2", "2-4"]):
        x = 90 + i * 315
        draw_card(draw, (x, 260, x + 285, 465), f"Window {label}", "Customers inside the time window. Cards can be moved by drag and drop.", COLORS["blue"])
    draw_card(draw, (90, 515, 520, 710), "Daily capacity", "Technician load: active, done, need parts, and missing time.", COLORS["green"])
    draw_card(draw, (550, 515, 960, 710), "Recommended open slots", "Suggested slots for placing unscheduled customers.", COLORS["amber"])
    draw_card(draw, (990, 515, 1310, 710), "Conflicts", "Warnings for overloaded windows and time mismatches.", COLORS["red"])
    callout(draw, 1, "Drag and drop", "Перетащи job в другое окно, чтобы быстро изменить расписание.", (90, 755), COLORS["blue"])
    callout(draw, 2, "Фильтр техника", "Можно смотреть всех или одного техника.", (510, 755), COLORS["green"])
    callout(draw, 3, "Needs attention", "Вверху есть напоминания по schedule.", (930, 755), COLORS["red"])
    return img


def page_technician():
    img = Image.new("RGB", (WIDTH, HEIGHT), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    draw_shell(draw, "Admin: Technician Day", "Simplified day view for field technicians.")
    draw_card(draw, (100, 250, 520, 455), "Date and technician", "Filter jobs by selected date and assigned technician.", COLORS["blue"])
    draw_card(draw, (550, 250, 980, 455), "Job card", "Address, phone, appliance, problem, invoice, and job status.", COLORS["green"])
    draw_card(draw, (1010, 250, 1300, 455), "Route", "Open the daily route in Google Maps.", COLORS["amber"])
    draw_card(draw, (100, 520, 650, 700), "Statuses", "On the way, In progress, Need parts, Done, Reschedule, Canceled.", COLORS["blue"])
    draw_card(draw, (700, 520, 1300, 700), "Quick actions", "Call, Maps, and Open invoice without searching the full CRM.", COLORS["green"])
    callout(draw, 1, "Для техника", "Этот раздел проще, чем полный schedule.", (100, 750), COLORS["blue"])
    callout(draw, 2, "После визита", "Обязательно обновить статус работы.", (530, 750), COLORS["green"])
    callout(draw, 3, "Если нужны детали", "Ставим Need parts и добавляем part в invoice.", (960, 750), COLORS["amber"])
    return img


def page_invoices():
    img = Image.new("RGB", (WIDTH, HEIGHT), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    draw_shell(draw, "Admin: Invoices", "Invoice list, statuses, payments, filters, and detail links.")
    draw_card(draw, (90, 250, 430, 430), "Filters", "Open, Archive, All, and draft/sent/paid/void status.", COLORS["blue"])
    draw_card(draw, (460, 250, 820, 430), "Search", "Name, phone, address, invoice number, appliance, technician.", COLORS["green"])
    draw_card(draw, (850, 250, 1270, 430), "New invoice", "Create a manual invoice or create it from a lead.", COLORS["amber"])
    draw_card(draw, (90, 495, 650, 700), "Invoice list", "Customer, amount, payment state, visit date, status, and technician.", COLORS["blue"])
    draw_card(draw, (700, 495, 1270, 700), "Open detail", "Edit invoice, payments, parts, schedule, and activity.", COLORS["green"])
    callout(draw, 1, "Контроль денег", "Список помогает видеть unpaid и paid.", (90, 750), COLORS["blue"])
    callout(draw, 2, "Не путать", "Invoice - это счет клиенту; expense - расход бизнеса.", (530, 750), COLORS["red"])
    callout(draw, 3, "Быстрый возврат", "В шапке есть Dashboard/Search/Schedule.", (960, 750), COLORS["green"])
    return img


def page_invoice_detail():
    img = Image.new("RGB", (WIDTH, HEIGHT), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    draw_shell(draw, "Admin: Invoice Detail", "Main job record: customer, invoice, schedule, payments, and parts.")
    draw_card(draw, (80, 245, 470, 415), "Services and charges", "Customer-facing invoice items. These change invoice total.", COLORS["blue"])
    draw_card(draw, (500, 245, 890, 415), "Internal parts", "Internal part tracking and cost. This does not change customer total.", COLORS["amber"])
    draw_card(draw, (920, 245, 1320, 415), "Payments", "Add payment amount, date/time, method, and note.", COLORS["green"])
    draw_card(draw, (80, 480, 470, 680), "Visit schedule", "Date, exact time, window, technician, and job status.", COLORS["blue"])
    draw_card(draw, (500, 480, 890, 680), "Expense link", "When a part is expensed, a link appears back to Accounting.", COLORS["green"])
    draw_card(draw, (920, 480, 1320, 680), "Activity", "Scrollable history of invoice operations and updates.", COLORS["red"])
    callout(draw, 1, "Клиентский счет", "Добавляй charge сверху, если клиент должен платить.", (80, 735), COLORS["blue"])
    callout(draw, 2, "Расходы бизнеса", "Запчасти с cost отправляй в expense отдельно.", (500, 735), COLORS["amber"])
    callout(draw, 3, "Всегда сохраняй", "После изменения part/status/schedule нажимай Save.", (920, 735), COLORS["green"])
    return img


def page_parts():
    img = Image.new("RGB", (WIDTH, HEIGHT), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    draw_shell(draw, "Admin: Parts Inventory", "All job parts in one place.")
    draw_card(draw, (90, 250, 430, 450), "Statuses", "Needed, Ordered, Received, Installed, Returned, Canceled.", COLORS["blue"])
    draw_card(draw, (460, 250, 820, 450), "Search and filters", "Part name, part number, supplier, customer, invoice.", COLORS["green"])
    draw_card(draw, (850, 250, 1270, 450), "Open parts", "See which jobs are waiting on parts.", COLORS["amber"])
    draw_card(draw, (90, 515, 650, 705), "Invoice link", "Every part links back to the customer invoice.", COLORS["blue"])
    draw_card(draw, (700, 515, 1270, 705), "Expensed", "Shows whether a part cost was sent to accounting.", COLORS["green"])
    callout(draw, 1, "Когда заказали", "Поменяй статус на Ordered и добавь supplier/part number.", (90, 750), COLORS["blue"])
    callout(draw, 2, "Когда поставили", "Поменяй статус на Installed.", (510, 750), COLORS["green"])
    callout(draw, 3, "Cost - это расход", "Cost не увеличивает invoice total автоматически.", (930, 750), COLORS["red"])
    return img


def page_accounting():
    img = Image.new("RGB", (WIDTH, HEIGHT), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    draw_shell(draw, "Admin: Accounting", "Revenue, collected payments, expenses, and estimated profit.")
    draw_card(draw, (90, 250, 390, 430), "Invoice value", "Total invoice value for the selected month.", COLORS["blue"])
    draw_card(draw, (420, 250, 720, 430), "Collected", "Payments actually collected.", COLORS["green"])
    draw_card(draw, (750, 250, 1050, 430), "Expenses", "Parts, gas, tools, ads, software, and other costs.", COLORS["red"])
    draw_card(draw, (1080, 250, 1310, 430), "Profit", "Estimated monthly profit.", COLORS["amber"])
    draw_card(draw, (90, 500, 650, 705), "Add expense", "Date, category, amount, payment method, vendor, description, note.", COLORS["blue"])
    draw_card(draw, (700, 500, 1310, 705), "Job profit", "Revenue, cost, and profit by individual invoice.", COLORS["green"])
    callout(draw, 1, "Расходы вручную", "Вносить gas/tools/ads/software тут.", (90, 750), COLORS["blue"])
    callout(draw, 2, "Parts из invoice", "Запчасть можно отправить в expense прямо из invoice.", (510, 750), COLORS["green"])
    callout(draw, 3, "Период", "Сначала выбери месяц, потом смотри цифры.", (930, 750), COLORS["amber"])
    return img


PAGES = {
    "01-dashboard.png": page_dashboard,
    "02-global-search.png": page_search,
    "03-leads.png": page_leads,
    "04-schedule.png": page_schedule,
    "05-technician-day.png": page_technician,
    "06-invoices.png": page_invoices,
    "07-invoice-detail.png": page_invoice_detail,
    "08-parts-inventory.png": page_parts,
    "09-accounting.png": page_accounting,
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for filename, factory in PAGES.items():
        factory().save(OUTPUT_DIR / filename, "PNG", optimize=True)
        print(OUTPUT_DIR / filename)


if __name__ == "__main__":
    main()
