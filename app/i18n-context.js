"use client";

import { createContext, useContext, useState, useEffect } from "react";

// ── Translation strings ──────────────────────────────────────────────────────
const strings = {
  ar: {
    // Brand
    brandAr: "لقمتي",
    brandEn: "Luqmati",

    // Nav
    home: "الرئيسية",
    history: "السجل",
    profile: "الملف",
    addMeal: "إضافة",
    signIn: "دخول",
    signUp: "حساب جديد",

    // Home page
    heroTitle: "اعرف أكلك",
    heroSubtitle: "صوّر طبقك واعرف تفاصيله بالذكاء الاصطناعي",
    uploadHint: "اسحب الصورة هنا أو اضغط للرفع",
    btnCamera: "صور اكلك",
    btnGallery: "اختر من المعرض",
    btnAnalyze: "حلّل الطبق",
    btnChangeImage: "تغيير الصورة",
    btnViewHistory: "عرض السجل",
    btnAnalyzeAnother: "تحليل طبق آخر",
    analyzing: "جاري تحليل طبقك...",
    signInToAnalyze: "لازم تسجل دخول عشان تحلل الطبق وتحفظه",
    btnSignIn: "تسجيل الدخول",
    savedConfirmation: "✅ تم تسجيل الوجبة في سجلك",
    lowConfidenceNote: "⚠️ القيم دي تقديرية وممكن تكون مش دقيقة جداً بسبب جودة الصورة أو التنوع في طريقة التحضير.",

    // Macros
    calories: "السعرات",
    protein: "بروتين",
    carbs: "كربوهيدرات",
    fats: "دهون",
    kcal: "سعرة",
    grams: "جم",
    ingredients: "المكونات",
    portionSize: "الحجم",
    weight: "الوزن التقريبي",

    // Usage
    analysesLeft: "تحليل متبقي",
    analysisLeft: "تحليل متبقي",
    resetIn: "يتجدد بعد",
    limitReached: "وصلت للحد اليومي",

    // History
    historyTitle: "السجل",
    historyEmpty: "السجل فاضي لسه",
    historyEmptyHint: "صوّر أي طبق وحلّله عشان يتسجل هنا",
    btnAnalyzeNow: "حلّل طبق دلوقتي",
    mealsCount: "وجبة مسجلة",
    today: "اليوم",
    yesterday: "أمس",
    retry: "حاول تاني",
    loading: "جاري التحميل...",
    historyLoading: "جاري تحميل سجلك...",

    // Auth gates
    loginRequired: "لازم تسجل دخول",
    loginToSeeHistory: "عشان تشوف سجل وجباتك، سجل دخول أو عمل حساب جديد",
    btnLoginNow: "سجل دخول",

    // Profile
    profileTitle: "الملف الشخصي",
    stats: "إحصائياتك",
    mealLog: "سجل الوجبات",
    analyzeNew: "حلّل طبق جديد",
    defaultUserName: "مستخدم لقمتي",

    // Errors
    noImage: "اختار صورة أكل الأول.",
    notSignedIn: "لازم تسجل دخول الأول عشان تحلل الطبق.",
    imageTooLarge: "الصورة أكبر من 10MB. اختار صورة أصغر.",
    notAnImage: "الملف ده مش صورة. اختار صورة تاني.",
    analysisError: "حصلت مشكلة أثناء التحليل، جرّب تاني.",
    btnRetry: "حاول تاني",

    // Offline
    offlineTitle: "مفيش إنترنت",
    offlineAnalysisMsg: "عشان تحلل أكل جديد، محتاج اتصال بالإنترنت.",
    offlineHistoryMsg: "ممكن تشوف السجل القديم من غير إنترنت.",

    // Confidence
    confidenceHigh: "دقة عالية",
    confidenceMedium: "دقة متوسطة",
    confidenceLow: "دقة منخفضة",
  },

  en: {
    // Brand
    brandAr: "لقمتي",
    brandEn: "Luqmati",

    // Nav
    home: "Home",
    history: "History",
    profile: "Profile",
    addMeal: "Add",
    signIn: "Sign In",
    signUp: "Sign Up",

    // Home page
    heroTitle: "Know Your Food",
    heroSubtitle: "Snap your plate and get AI-powered nutrition analysis",
    uploadHint: "Drag your photo here or tap to upload",
    btnCamera: "Take Photo",
    btnGallery: "Choose from Gallery",
    btnAnalyze: "Analyze Plate",
    btnChangeImage: "Change Image",
    btnViewHistory: "View History",
    btnAnalyzeAnother: "Analyze Another",
    analyzing: "Analyzing your plate...",
    signInToAnalyze: "Sign in to analyze your plate and save your results",
    btnSignIn: "Sign In",
    savedConfirmation: "✅ Meal saved to your history",
    lowConfidenceNote: "⚠️ These values are estimates and may not be fully accurate due to image quality or recipe variation.",

    // Macros
    calories: "Calories",
    protein: "Protein",
    carbs: "Carbs",
    fats: "Fats",
    kcal: "kcal",
    grams: "g",
    ingredients: "Ingredients",
    portionSize: "Portion",
    weight: "Est. Weight",

    // Usage
    analysesLeft: "analyses left",
    analysisLeft: "analysis left",
    resetIn: "Resets in",
    limitReached: "Daily limit reached",

    // History
    historyTitle: "History",
    historyEmpty: "No meals yet",
    historyEmptyHint: "Snap a plate and analyze it — it will appear here",
    btnAnalyzeNow: "Analyze a Plate",
    mealsCount: "meals recorded",
    today: "Today",
    yesterday: "Yesterday",
    retry: "Try Again",
    loading: "Loading...",
    historyLoading: "Loading your history...",

    // Auth gates
    loginRequired: "Sign In Required",
    loginToSeeHistory: "Sign in to view your meal history",
    btnLoginNow: "Sign In",

    // Profile
    profileTitle: "Profile",
    stats: "Your Stats",
    mealLog: "Meal Log",
    analyzeNew: "Analyze a New Plate",
    defaultUserName: "Luqmati User",

    // Errors
    noImage: "Please choose a food photo first.",
    notSignedIn: "You need to sign in before analyzing.",
    imageTooLarge: "Image is over 10MB. Please choose a smaller one.",
    notAnImage: "That file is not an image. Please choose an image.",
    analysisError: "Something went wrong during analysis. Please try again.",
    btnRetry: "Try Again",

    // Offline
    offlineTitle: "No Internet",
    offlineAnalysisMsg: "You need an internet connection to analyze new food.",
    offlineHistoryMsg: "You can still browse your saved history offline.",

    // Confidence
    confidenceHigh: "High accuracy",
    confidenceMedium: "Medium accuracy",
    confidenceLow: "Low accuracy",
  },
};

// ── Context ──────────────────────────────────────────────────────────────────
const LangContext = createContext({
  lang: "ar",
  dir: "rtl",
  t: strings.ar,
  toggleLang: () => {},
});

export function LangProvider({ children }) {
  const [lang, setLang] = useState("ar");

  useEffect(() => {
    const saved = localStorage.getItem("luqmati-lang");
    if (saved === "ar" || saved === "en") {
      setLang(saved);
      document.documentElement.lang = saved;
      document.documentElement.dir  = saved === "ar" ? "rtl" : "ltr";
    }
  }, []);

  function toggleLang() {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    localStorage.setItem("luqmati-lang", next);
    document.documentElement.lang = next;
    document.documentElement.dir  = next === "ar" ? "rtl" : "ltr";
  }

  const value = {
    lang,
    dir: lang === "ar" ? "rtl" : "ltr",
    t: strings[lang],
    toggleLang,
  };

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
