import { create } from "zustand";

export type Lang = "en" | "hi";

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    billing: "Billing",
    products: "Products",
    purchases: "Purchases",
    suppliers: "Suppliers",
    customers: "Customers",
    reports: "Reports",
    users: "Users",
    newSale: "New Sale",
    addProduct: "Add Product",
    recordPurchase: "Record Purchase",
    todaySales: "Today's Sales",
    creditGiven: "Credit Given",
    lowStock: "Low Stock",
    revenue: "Revenue",
    cogs: "COGS",
    grossProfit: "Gross Profit",
    logout: "Logout",
    offline: "Offline",
    online: "Online",
    sync: "Sync",
    darkMode: "Dark Mode",
    language: "Language",
    search: "Search",
    cart: "Cart",
    checkout: "Checkout",
    total: "Total",
    discount: "Discount",
    paymentMethod: "Payment Method",
    amountPaid: "Amount Paid",
    completeSale: "Complete Sale",
    print: "Print",
    shareWhatsApp: "Share on WhatsApp",
    gst: "GST",
    taxable: "Taxable",
    cgst: "CGST",
    sgst: "SGST",
    igst: "IGST",
    invoice: "Invoice",
    backup: "Backup",
    restore: "Restore",
    settings: "Settings",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    billing: "बिलिंग",
    products: "वस्तुएँ",
    purchases: "खरीद",
    suppliers: "आपूर्तिकर्ता",
    customers: "ग्राहक",
    reports: "रिपोर्ट",
    users: "उपयोगकर्ता",
    newSale: "नई बिक्री",
    addProduct: "वस्तु जोड़ें",
    recordPurchase: "खरीद दर्ज करें",
    todaySales: "आज की बिक्री",
    creditGiven: "दिया गया क्रेडिट",
    lowStock: "कम स्टॉक",
    revenue: "राजस्व",
    cogs: "विक्रय लागत",
    grossProfit: "सकल लाभ",
    logout: "लॉगआउट",
    offline: "ऑफ़लाइन",
    online: "ऑनलाइन",
    sync: "सिंक",
    darkMode: "डार्क मोड",
    language: "भाषा",
    search: "खोजें",
    cart: "कार्ट",
    checkout: "चेकआउट",
    total: "कुल",
    discount: "छूट",
    paymentMethod: "भुगतान विधि",
    amountPaid: "भुगतान की गई राशि",
    completeSale: "बिक्री पूर्ण करें",
    print: "प्रिंट",
    shareWhatsApp: "व्हाट्सएप पर शेयर करें",
    gst: "जीएसटी",
    taxable: "कर योग्य",
    cgst: "सीजीएसटी",
    sgst: "एसजीएसटी",
    igst: "आईजीएसटी",
    invoice: "चालान",
    backup: "बैकअप",
    restore: "पुनर्स्थापित",
    settings: "सेटिंग्स",
  },
};

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

export const useI18n = create<I18nState>((set, get) => ({
  lang: (localStorage.getItem("kirana_lang") as Lang) || "en",
  setLang: (lang) => {
    localStorage.setItem("kirana_lang", lang);
    set({ lang });
  },
  t: (key) => {
    const { lang } = get();
    return STRINGS[lang][key] || STRINGS.en[key] || key;
  },
}));
