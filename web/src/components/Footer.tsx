import "./Footer.css";

const REPO = "https://github.com/SAY-5/bench-reliability";

export function Footer() {
  return (
    <footer className="ft">
      <div className="ft-grid">
        <div>
          <p className="eyebrow">what this is</p>
          <h3>A reproducible model of the repair.</h3>
          <p>
            Every figure here comes from the same seeded, deterministic logic as
            the command-line toolkit: the 600 to 850 ms latency model, the
            timeout and retry client, the udev rule validator, and the
            keyword-based ticket classifier. No real hardware, no random runs,
            no hidden state. Drag the slider or replug the bench and the numbers
            move exactly as the model says they should.
          </p>
          <div className="ft-meta">
            <span className="ft-tag">seeded latency 600&ndash;850 ms</span>
            <span className="ft-tag">timeout + retry client</span>
            <span className="ft-tag">udev serial mapping</span>
            <span className="ft-tag">8 / week &rarr; 2 / month</span>
          </div>
        </div>
        <div>
          <a className="ft-repo" href={REPO} target="_blank" rel="noreferrer noopener">
            <span aria-hidden="true">&#9733;</span>
            View the toolkit on GitHub
          </a>
          <p className="ft-fine">
            The interactive model ships alongside the Go toolkit it mirrors.
            Build it from the web directory with npm run build.
          </p>
        </div>
      </div>
    </footer>
  );
}
