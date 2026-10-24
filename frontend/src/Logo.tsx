interface LogoProps {
  variant?: 'full' | 'icon'
  inverted?: boolean
  height?: number
}

const FONT = "'Inter Variable', Inter, Arial, sans-serif"

export function Logo({ variant = 'full', inverted = true, height = 32 }: LogoProps) {
  const key = inverted ? '#FFFFFF' : '#000000'
  const ink = inverted ? '#000000' : '#FFFFFF'

  if (variant === 'icon') {
    return (
      <svg viewBox="0 0 5.2 5.2" height={height} role="img" aria-label="Aéza">
        <rect width="5.2" height="5.2" rx="1.3" fill={key} />
        <text x="2.6" y="3.75" textAnchor="middle" fontSize="4.2" fontWeight="700" fontFamily={FONT} fill={ink}>
          é
        </text>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 22 5.2" height={height} role="img" aria-label="Aéza">
      {['a', 'é', 'z', 'a'].map((letter, i) => (
        <g key={i} transform={`translate(${i * 5.6} 0)`}>
          <rect width="5.2" height="5.2" rx="1.3" fill={key} />
          <text x="2.6" y="3.75" textAnchor="middle" fontSize="4.2" fontWeight="700" fontFamily={FONT} fill={ink}>
            {letter}
          </text>
        </g>
      ))}
    </svg>
  )
}
