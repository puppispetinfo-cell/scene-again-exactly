import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Search, ChevronsDown } from "lucide-react";
import exterior from "@/assets/hero-house.jpg";
import interior from "@/assets/interior-living.jpg";
import terrace from "@/assets/terrace-garden.jpg";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/search-form";

export function ScrollStory() {
  const section = useRef<HTMLElement>(null);
  const returning = useRef(false);
  const returnToSearch = () => {
    const node = section.current;
    if (!node) return;
    returning.current = true;
    window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let current = 0;
    let previous = 0;
    const ease = (value: number, start: number, end: number) => {
      const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
      return t * t * (3 - 2 * t);
    };
    const update = (time = performance.now()) => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const stage = node.querySelector<HTMLElement>(".story-stage");
      const distance = Math.max(1, rect.height - (stage?.offsetHeight ?? window.innerHeight));
      const target = reduced.matches ? 0 : Math.min(1, Math.max(0, -rect.top / distance));
      const delta = previous ? Math.min(64, time - previous) : 16;
      previous = time;
      current += (target - current) * (1 - Math.exp(-delta / 130));
      if (Math.abs(target - current) < 0.0001) current = target;
      const progress = current;
      const introOpacity = 1 - ease(progress, 0.14, 0.3);
      const secondOpacity = ease(progress, 0.28, 0.41) * (1 - ease(progress, 0.61, 0.74));
      const thirdOpacity = ease(progress, 0.74, 0.86);
      node.style.setProperty("--story-progress", String(progress));
      node.style.setProperty("--intro-opacity", String(introOpacity));
      node.style.setProperty("--scene-opacity", String(secondOpacity));
      node.style.setProperty("--third-opacity", String(thirdOpacity));
      node.style.setProperty("--image-reveal", String(ease(progress, 0.2, 0.4)));
      node.style.setProperty("--third-reveal", String(ease(progress, 0.65, 0.83)));
      const intro = node.querySelector<HTMLElement>(".story-intro");
      const scene = node.querySelector<HTMLElement>(".story-second");
      const third = node.querySelector<HTMLElement>(".story-third");
      const back = node.querySelector<HTMLElement>(".story-search-return");
      if (intro) { intro.inert = introOpacity < 0.05; intro.setAttribute("aria-hidden", String(introOpacity < 0.001)); }
      if (scene) { scene.inert = secondOpacity < 0.1; scene.setAttribute("aria-hidden", String(secondOpacity < 0.001)); }
      if (third) { third.inert = thirdOpacity < 0.1; third.setAttribute("aria-hidden", String(thirdOpacity < 0.001)); }
      if (back) { back.inert = progress < 0.18; back.setAttribute("data-visible", String(progress >= 0.18)); }
      if (returning.current && target === 0 && current < 0.002) {
        returning.current = false;
        node.querySelector<HTMLInputElement>('input[data-search-location]')?.focus({ preventScroll: true });
      }
      if (current !== target) frame = requestAnimationFrame(update);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <section ref={section} className="scroll-story" aria-label="Espacios RIVTON">
      <div className="story-stage">
        <img src={exterior} alt="Casa contemporánea con grandes ventanales" fetchPriority="high" className="story-image story-exterior" />
        <img src={interior} alt="Interior residencial luminoso" loading="lazy" className="story-image story-interior" />
        <img src={terrace} alt="Terraza residencial abierta al jardín y la piscina" loading="lazy" width={1600} height={1008} className="story-image story-terrace" />
        <div className="story-shade" />
        <div className="story-intro text-ink-foreground">
          <div className="story-intro-heading">
            <p className="label-caps mb-4 text-ink-foreground/85">RIVTON Group · Córdoba</p>
            <h1 className="text-5xl leading-[1.02] lg:text-7xl">Encontrá<br />tu propiedad.</h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-foreground/85">Propiedades seleccionadas para cada etapa de tu vida.</p>
          </div>
          <div className="text-foreground"><SearchForm immersive /></div>
        </div>
        <div className="story-second text-ink-foreground" aria-hidden="true" inert>
          <div className="story-caption flex items-center justify-between gap-3">
            <p className="label-caps">RIVTON · Espacios para vivir</p>
            <span className="font-display text-xl" aria-hidden="true">02 / 03</span>
          </div>
          <div className="story-copy">
            <h2 className="max-w-3xl text-5xl leading-[1.05] sm:text-6xl lg:text-8xl">Otra forma<br />de habitar.</h2>
            <div className="mt-7 flex flex-wrap items-end justify-between gap-6">
              <p className="max-w-xs text-sm leading-relaxed text-ink-foreground/85">Espacios que se sienten propios.<br />Desde el primer momento.</p>
              <Button asChild variant="outline" className="h-12 border-ink-foreground/40 bg-ink/10 px-5 text-ink-foreground backdrop-blur-md hover:bg-ink-foreground hover:text-ink">
                <Link to="/propiedades">Encontrá tu lugar <ArrowUpRight /></Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="story-third text-ink-foreground" aria-hidden="true" inert>
          <div className="story-caption flex items-center justify-between gap-3">
            <p className="label-caps">RIVTON · Vivir al aire libre</p>
            <span className="font-display text-xl" aria-hidden="true">03 / 03</span>
          </div>
          <div className="story-copy">
            <h2 className="max-w-3xl text-5xl leading-[1.05] sm:text-6xl lg:text-8xl">Tu espacio.<br />Tu próxima etapa.</h2>
            <div className="mt-7 flex flex-wrap items-end justify-between gap-6">
              <p className="max-w-xs text-sm leading-relaxed text-ink-foreground/85">Un lugar para disfrutar.<br />Una nueva forma de vivir.</p>
              <Button asChild variant="outline" className="h-12 border-ink-foreground/40 bg-ink/10 px-5 text-ink-foreground backdrop-blur-md hover:bg-ink-foreground hover:text-ink">
                <Link to="/propiedades">Explorar propiedades <ArrowUpRight /></Link>
              </Button>
            </div>
          </div>
        </div>
        <Button onClick={returnToSearch} variant="outline" className="story-search-return rounded-full text-ink-foreground" data-visible="false" inert>
          <Search className="h-4 w-4" /> Buscar
        </Button>
        <div className="story-scroll-cue text-ink-foreground" aria-hidden="true">
          <span>Deslizá para descubrir</span><ChevronsDown className="h-4 w-4 shrink-0" />
        </div>
        <div className="story-progress-track" aria-hidden="true"><div className="story-progress-fill" /></div>
      </div>
    </section>
  );
}