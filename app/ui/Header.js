import { Image, useTheme, Heading } from "@aws-amplify/ui-react";

export function Header() {
  const { tokens } = useTheme();

  return (
      <Heading>MWH</Heading>
  );
}
