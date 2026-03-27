import Image from "next/image";

type LogoMarkProps = {
  size?: number;
  priority?: boolean;
};

export function LogoMark({ size = 40, priority = false }: LogoMarkProps) {
  return (
    <Image
      src="/brand/logo.svg"
      alt="Ruksak.ai"
      width={size}
      height={size}
      priority={priority}
    />
  );
}
