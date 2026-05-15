import Icon, { IconProps } from '@mui/material/Icon';

type MaterialSymbolProps = Omit<IconProps, 'children'> & {
  name: string;
};

export default function MaterialSymbol({ name, sx, ...rest }: MaterialSymbolProps) {
  return (
    <Icon
      baseClassName="material-symbols-outlined"
      sx={{
        fontFamily: '"Material Symbols Outlined"',
        fontWeight: 400,
        fontStyle: 'normal',
        lineHeight: 1,
        letterSpacing: 'normal',
        textTransform: 'none',
        whiteSpace: 'nowrap',
        wordWrap: 'normal',
        direction: 'ltr',
        fontFeatureSettings: '"liga"',
        WebkitFontFeatureSettings: '"liga"',
        WebkitFontSmoothing: 'antialiased',
        fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24',
        ...sx,
      }}
      {...rest}
    >
      {name}
    </Icon>
  );
}
