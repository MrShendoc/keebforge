const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#2C2C2C]">
      <div className="text-center text-white max-w-2xl px-6">
        <div className="mb-6 text-6xl">⌨️</div>
        <h1 className="mb-4 text-5xl font-bold">
          Keeb<span className="text-[#FF6A00]">Forge</span>
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Static blog for mechanical keyboard enthusiasts. Built for GitHub Pages deployment.
        </p>
        <div className="space-y-4">
          <p className="text-gray-400">
            The static site files are in <code className="bg-gray-700 px-2 py-1 rounded">/public/keebforge/</code>
          </p>
          <button 
            onClick={() => window.location.href = '/keebforge/index.html'}
            className="inline-block bg-[#FF6A00] hover:bg-[#D35400] text-white font-semibold px-8 py-3 rounded-lg transition-colors cursor-pointer"
          >
            View KeebForge Site →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
