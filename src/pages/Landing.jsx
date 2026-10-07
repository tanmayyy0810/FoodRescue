import "./Landing.css";

function Landing({ onGetStarted }) {
  return (
    <div className="landing-page">

      {/* NAVIGATION */}
      <header className="site-header">

        <div className="site-logo">
          <div className="site-logo-mark">F</div>
          <span>FoodRescue</span>
        </div>

        <nav className="main-nav">
          <a href="#how-it-works">How it works</a>
          <a href="#impact">Impact</a>
          <a href="#about">About</a>
        </nav>

        <div className="header-actions">
          <button
            className="signin-link"
            onClick={onGetStarted}
          >
            Sign in
          </button>

          <button
            className="header-button"
            onClick={onGetStarted}
          >
            Get started
          </button>
        </div>

      </header>


      {/* HERO */}
      <main>

        <section className="hero-section">

          <div className="hero-left">

            <p className="eyebrow">
              FOOD REDISTRIBUTION MANAGEMENT SYSTEM
            </p>

            <h1>
              Surplus food,
              <br />
              <span>better allocation.</span>
            </h1>

            <p className="hero-description">
              FoodRescue helps donors register surplus food and
              connects it with verified organizations based on
              availability, quantity, expiry and demand.
            </p>

            <div className="hero-actions">

              <button
                className="hero-primary-button"
                onClick={onGetStarted}
              >
                Get started
                <span>→</span>
              </button>

              <a
                href="#how-it-works"
                className="hero-text-button"
              >
                Explore the system
              </a>

            </div>


            {/* SMALL STATS */}
            <div className="hero-stat-row">

              <div className="hero-stat">
                <strong>1,240+</strong>
                <span>Meals redistributed</span>
              </div>

              <div className="hero-stat-divider"></div>

              <div className="hero-stat">
                <strong>38</strong>
                <span>Partner organizations</span>
              </div>

              <div className="hero-stat-divider"></div>

              <div className="hero-stat">
                <strong>96%</strong>
                <span>Request fulfillment</span>
              </div>

            </div>

          </div>


          {/* OPERATIONS PANEL */}
          <div className="operations-panel">

            <div className="operations-header">

              <div>
                <p>OPERATIONS OVERVIEW</p>
                <h2>Today's activity</h2>
              </div>

              <span className="date-label">
                FoodRescue
              </span>

            </div>


            <div className="operations-metrics">

              <div className="operation-metric">
                <span>Donations</span>
                <strong>24</strong>
                <small>food batches</small>
              </div>

              <div className="operation-metric">
                <span>Allocated</span>
                <strong>18</strong>
                <small>requests matched</small>
              </div>

              <div className="operation-metric">
                <span>Delivery</span>
                <strong>12</strong>
                <small>completed today</small>
              </div>

            </div>


            {/* RECENT BATCH */}
            <div className="panel-section">

              <div className="panel-section-header">
                <span>RECENT FOOD BATCH</span>
                <span>STATUS</span>
              </div>

              <div className="food-row">

                <div className="food-main">

                  <div className="food-icon">
                    VR
                  </div>

                  <div>
                    <strong>Vegetable Rice</strong>
                    <span>TajFresh Restaurant</span>
                  </div>

                </div>

                <div className="food-status">
                  <span className="status-dot"></span>
                  Available
                </div>

              </div>

              <div className="food-details">

                <div>
                  <span>Quantity</span>
                  <strong>100 meals</strong>
                </div>

                <div>
                  <span>Prepared</span>
                  <strong>5:00 PM</strong>
                </div>

                <div>
                  <span>Expires</span>
                  <strong>10:00 PM</strong>
                </div>

              </div>

            </div>


            {/* ALLOCATION */}
            <div className="panel-section allocation-preview">

              <div className="panel-section-header">
                <span>LATEST ALLOCATION</span>
                <span>CONFIRMED</span>
              </div>

              <div className="allocation-route">

                <div>
                  <span>DONOR</span>
                  <strong>TajFresh Restaurant</strong>
                </div>

                <div className="allocation-arrow">
                  →
                </div>

                <div>
                  <span>RECIPIENT</span>
                  <strong>Hope Foundation</strong>
                </div>

              </div>

              <div className="allocation-footer">
                <span>60 meals allocated</span>
                <span>Request #6001</span>
              </div>

            </div>

          </div>

        </section>


        {/* HOW IT WORKS */}
        <section
          className="how-section"
          id="how-it-works"
        >

          <div className="section-intro">

            <div>
              <p className="eyebrow">
                HOW THE SYSTEM WORKS
              </p>

              <h2>
                A simple workflow for
                <br />
                <span>surplus food management.</span>
              </h2>
            </div>

            <p>
              Every food batch and request is recorded,
              matched and tracked through the system.
            </p>

          </div>


          <div className="workflow">

            <div className="workflow-step">

              <span>01</span>

              <h3>Register surplus</h3>

              <p>
                Donors enter the food type, quantity,
                preparation time and expiry information.
              </p>

            </div>


            <div className="workflow-line"></div>


            <div className="workflow-step">

              <span>02</span>

              <h3>Match requests</h3>

              <p>
                Available batches are compared with NGO
                requests, quantity and expiry constraints.
              </p>

            </div>


            <div className="workflow-line"></div>


            <div className="workflow-step">

              <span>03</span>

              <h3>Track delivery</h3>

              <p>
                Allocations are recorded and deliveries
                remain traceable until completion.
              </p>

            </div>

          </div>

        </section>


        {/* IMPACT */}
        <section
          className="impact-section"
          id="impact"
        >

          <div className="impact-title">

            <p className="eyebrow">
              SYSTEM IMPACT
            </p>

            <h2>
              Making every
              <br />
              <span>allocation count.</span>
            </h2>

          </div>

          <div className="impact-grid">

            <div>
              <strong>1,240+</strong>
              <span>Meals redistributed</span>
            </div>

            <div>
              <strong>1.8K kg</strong>
              <span>Food saved from waste</span>
            </div>

            <div>
              <strong>38</strong>
              <span>Partner organizations</span>
            </div>

            <div>
              <strong>96%</strong>
              <span>Fulfillment rate</span>
            </div>

          </div>

        </section>


        {/* FOOTER */}
        <footer className="site-footer" id="about">

          <div className="footer-brand">

            <div className="site-logo">
              <div className="site-logo-mark">F</div>
              <span>FoodRescue</span>
            </div>

            <p>
              Food redistribution management system.
            </p>

          </div>

          <div className="footer-right">
            <span>BCSE302P Database Systems Project</span>
            <span>© 2026 FoodRescue</span>
          </div>

        </footer>

      </main>

    </div>
  );
}

export default Landing;