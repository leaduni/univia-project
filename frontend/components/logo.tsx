// App logo component used in sidebar — gradient brand text
import Image from "next/image"

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1">
      <Image
        src="/Logo_LEAD_UNI.png"
        alt="LEAD UNI"
        width={28}
        height={28}
        priority
        className="w-7 h-7"
      />
      <span className="text-xl font-extrabold bg-gradient-to-r from-[#f43f5e] via-[#ec4899] to-[#a855f7] bg-clip-text text-transparent tracking-tight drop-shadow-sm">
        UniVia
      </span>
    </div>
  )
}