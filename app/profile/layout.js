export const metadata = {
  title: "الملف الشخصي | لقمتي Luqmati",
  description: "بيانات ملفك الشخصي وإحصائيات استخدامك في تطبيق لقمتي",
  robots: {
    index: false, // Private user profile page
    follow: true,
  },
};

export default function ProfileLayout({ children }) {
  return <>{children}</>;
}
