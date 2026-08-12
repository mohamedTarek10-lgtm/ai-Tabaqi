export const metadata = {
  title: "سجل الوجبات | لقمتي Luqmati",
  description: "تصفح سجل الوجبات السابقة وتحليلات السعرات والبروتين والماكروز في تطبيق لقمتي",
  robots: {
    index: false, // Private user history page
    follow: true,
  },
};

export default function HistoryLayout({ children }) {
  return <>{children}</>;
}
