export default function TermsPage() {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px", fontFamily: "inherit", lineHeight: 1.7 }}>
      <h1>Terms &amp; Privacy</h1>
      <p style={{ color: "#6b7280", fontSize: 14 }}>Last updated: April 2026</p>

      <h2>What we collect</h2>
      <p>
        We collect your email address when you sign up, along with the workout data and diet preferences
        you enter into the app (exercise logs, body measurements, calorie targets, food preferences).
        This information is stored in our database to power your personalised plans.
      </p>

      <h2>How we use it</h2>
      <p>
        Your data is used solely to generate AI-powered workout and diet plans tailored to your goals,
        and to match you with a coach if you choose that feature. We do not use your data for any
        purpose unrelated to the service you signed up for.
      </p>

      <h2>What we don&apos;t do</h2>
      <p>
        We never sell your personal data to third parties. There are no third-party advertising
        networks on this platform and we do not share your information with advertisers or data brokers.
      </p>

      <h2>Payments</h2>
      <p>
        All payment processing is handled by Razorpay. We never see or store your card details —
        they go directly to Razorpay&apos;s secure servers. You can review Razorpay&apos;s privacy policy
        at razorpay.com.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about your data or these terms? Email us at{" "}
        <a href="mailto:fraz.akram@raga.ai">fraz.akram@raga.ai</a>.
      </p>
    </div>
  );
}
