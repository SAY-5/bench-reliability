import { Hero } from "./components/Hero";
import { TimeoutFix } from "./components/TimeoutFix";
import { PortNaming } from "./components/PortNaming";
import { Tickets } from "./components/Tickets";
import { Footer } from "./components/Footer";
import { ScrollProgress } from "./components/ScrollProgress";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#timeout">
        Skip to the fixes
      </a>
      <ScrollProgress />
      <main id="top">
        <Hero />
        <TimeoutFix />
        <PortNaming />
        <Tickets />
      </main>
      <Footer />
    </>
  );
}
