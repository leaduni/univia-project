import Image from "next/image"

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/Logo_LEAD_UNI.png"
        alt="LEAD UNI"
        width={45}
        height={45}
        priority
      />

      <div>
        <h1 className="font-bold text-lg">UniVia</h1>
        <p className="text-xs text-muted-foreground">
          Powered by LEAD UNI
        </p>
      </div>
    </div>
  )
}