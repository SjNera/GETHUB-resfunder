export type SceneProps = {
  frameloop: "always" | "demand" | "never";
  dpr: [number, number];
  reduced: boolean;
  coarse: boolean;
  onReady?: () => void;
};
