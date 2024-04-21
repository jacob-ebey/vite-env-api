function Hero({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero bg-base-200 py-8">
      <div className="hero-content text-center">
        <div className="max-w-md">{children}</div>
      </div>
    </div>
  );
}

function HeroTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-5xl font-bold">{children}</h1>;
}

function HeroDescription({ children }: { children: React.ReactNode }) {
  return <p className="py-6">{children}</p>;
}

export { Hero, HeroTitle, HeroDescription };
