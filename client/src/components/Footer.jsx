export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Wanderlust — Find your next stay.</p>
        <p>Built with the MERN stack.</p>
      </div>
    </footer>
  );
}
