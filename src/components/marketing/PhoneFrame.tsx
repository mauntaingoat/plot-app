interface PhoneFrameProps {
  src: string
  alt?: string
  className?: string
}

export function PhoneFrame({ src, alt = 'App screenshot', className = '' }: PhoneFrameProps) {
  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: 280 }}
    >
      {/* Phone body */}
      <div
        className="relative overflow-hidden bg-black"
        style={{
          borderRadius: 40,
          border: '4px solid #1A1A1A',
          boxShadow: '0 25px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)',
          aspectRatio: '9 / 19.5',
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 z-20 bg-black"
          style={{
            width: 120,
            height: 28,
            borderRadius: '0 0 18px 18px',
          }}
        >
          {/* Camera dot */}
          <div
            className="absolute top-[8px] left-1/2 -translate-x-1/2 rounded-full bg-[#1c1c1e]"
            style={{ width: 12, height: 12, boxShadow: 'inset 0 0 2px rgba(255,255,255,0.08)' }}
          />
        </div>

        {/* Screenshot */}
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          style={{ display: 'block' }}
        />

        {/* Home indicator */}
        <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 z-20">
          <div
            className="rounded-full bg-white/30"
            style={{ width: 120, height: 4 }}
          />
        </div>
      </div>
    </div>
  )
}
