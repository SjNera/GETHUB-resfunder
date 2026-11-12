/** CSS version of the orb: poster while three.js loads, and the no-WebGL fallback. */
export function CssOrb() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="aspect-square w-[70%] max-w-[34rem] rounded-full opacity-90 blur-2xl [background:radial-gradient(circle_at_30%_30%,#ffd29c_0%,#ff8a1c_22%,rgba(255,138,28,0.35)_42%,transparent_62%),radial-gradient(circle_at_72%_68%,rgba(120,140,255,0.35)_0%,transparent_40%)]" />
    </div>
  );
}
