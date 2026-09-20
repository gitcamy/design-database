import MarqueeAlongSvgPath from "@/components/ui/marquee-along-svg-path"
import { useState } from "react"

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=400&q=80&auto=format&fit=crop`

const imgs = [
  "1506744038136-46273834b3fb",
  "1500530855697-b586d89ba3ee",
  "1469474968028-56623f02e42e",
  "1441974231531-c6227db76b6e",
  "1470071459604-3b5ec3a7fe05",
  "1501785888041-af3ef285b470",
  "1472214103451-9374bd1c798e",
  "1447752875215-b2761acb3c5d",
  "1465146344425-f00d5f5c8f07",
  "1433086966358-54859d0ed716",
  "1482938289607-e9573fc25ebb",
  "1426604966848-d7adac402bff",
  "1518837695005-2083093ee35b",
].map(unsplash)

const path =
  "M1.12756 531.57C28.0893 516.8 74.8013 483.241 115.862 435.167M115.862 435.167C142.71 403.734 167.142 366.095 182.056 323.447C229.212 188.604 -65.6747 303.582 53.6794 397.09C73.8056 412.858 94.5052 425.626 115.862 435.167ZM115.862 435.167C221.157 482.211 342.426 450.85 489.709 314.125C517.752 288.093 540.139 265.319 557.876 245.305M557.876 245.305C652.19 138.884 615.024 110.493 597.546 85.1004C576.782 54.9327 401.867 14.2899 417.559 188.351C424.308 263.214 481.985 261.608 557.876 245.305ZM557.876 245.305C646.667 226.232 760.389 187.041 846.65 226.667M846.65 226.667C858.081 231.918 869.031 238.554 879.376 246.804C1034.5 370.518 957.576 540.884 843.253 562.658C768.137 576.964 767.606 395.943 846.65 226.667ZM846.65 226.667C887.908 138.309 950.848 53.1511 1036.18 0.642822"

export default function MarqueeAlongSvgPathDemo() {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  return (
    <div
      className="w-dvw h-dvh relative bg-zinc-50 flex justify-center overflow-auto"
      ref={(node) => setContainer(node)}
    >
      <h2 className="mt-36 text-4xl">scroll down</h2>
      <div className="absolute h-[120%] sm:h-[150%] top-40 w-full justify-center items-center flex flex-col space-y-2 sm:space-y-3 md:space-y-4">
        <MarqueeAlongSvgPath
          path={path}
          viewBox="0 0 1040 570"
          baseVelocity={4}
          showPath={false}
          slowdownOnHover={true}
          draggable={true}
          dragAwareDirection
          dragVelocityDecay={0.98}
          scrollAwareDirection={true}
          useScrollVelocity={true}
          scrollContainer={{ current: container }}
          repeat={4}
          enableRollingZIndex={true}
          dragSensitivity={0.01}
          className="absolute top-0 w-full h-full"
          responsive
          grabCursor
        >
          {imgs.map((img, i) => (
            <div key={i} className="w-14 h-full cursor-pointer">
              <img
                src={img}
                alt={`Example ${i}`}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </MarqueeAlongSvgPath>
      </div>
    </div>
  )
}
