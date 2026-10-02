// Framer code component port of marquee-along-svg-path, which is
// MarqueeAlongSvgPath from Fancy Components by Daniel Petho (MIT,
// https://github.com/danielpetho/fancy). See ../LICENSE.
// No Tailwind or `cn`: styles are inline. Uses Framer's bundled framer-motion.
// Per-item hooks live in <PathItem> so item count can change from the
// property panel without breaking the rules of hooks.
import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import {
    motion,
    useAnimationFrame,
    useMotionValue,
    useScroll,
    useSpring,
    useTransform,
    useVelocity,
} from "framer-motion"

const DEFAULT_PATH =
    "M1.12756 531.57C28.0893 516.8 74.8013 483.241 115.862 435.167M115.862 435.167C142.71 403.734 167.142 366.095 182.056 323.447C229.212 188.604 -65.6747 303.582 53.6794 397.09C73.8056 412.858 94.5052 425.626 115.862 435.167ZM115.862 435.167C221.157 482.211 342.426 450.85 489.709 314.125C517.752 288.093 540.139 265.319 557.876 245.305M557.876 245.305C652.19 138.884 615.024 110.493 597.546 85.1004C576.782 54.9327 401.867 14.2899 417.559 188.351C424.308 263.214 481.985 261.608 557.876 245.305ZM557.876 245.305C646.667 226.232 760.389 187.041 846.65 226.667M846.65 226.667C858.081 231.918 869.031 238.554 879.376 246.804C1034.5 370.518 957.576 540.884 843.253 562.658C768.137 576.964 767.606 395.943 846.65 226.667ZM846.65 226.667C887.908 138.309 950.848 53.1511 1036.18 0.642822"

const DEFAULT_IMAGES = [
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
].map((id) => ({
    src: `https://images.unsplash.com/photo-${id}?w=400&q=80&auto=format&fit=crop`,
    srcSet: undefined as string | undefined,
    alt: "",
}))

const wrap = (min: number, max: number, value: number): number => {
    const range = max - min
    return ((((value - min) % range) + range) % range) + min
}

function PathItem(props: {
    baseOffset: any
    index: number
    total: number
    path: string
    rolling: boolean
    zBase: number
    zRange: number
    rotate: boolean
    width: number
    height: number
    grab: boolean
    hidden: boolean
    onEnter: () => void
    onLeave: () => void
    children: React.ReactNode
}) {
    const { baseOffset, index, total, path, rolling, zBase, zRange } = props
    const distance = useTransform(baseOffset, (v: number) =>
        wrap(0, 100, v + (index * 100) / total)
    )
    const offsetDistance = useTransform(distance, (d: number) => `${d}%`)
    const zIndex = useTransform(distance, (d: number) =>
        Math.floor(zBase + (d / 100) * zRange)
    )

    return (
        <motion.div
            aria-hidden={props.hidden}
            onMouseEnter={props.onEnter}
            onMouseLeave={props.onLeave}
            style={
                {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: props.width,
                    height: props.height,
                    offsetPath: `path('${path}')`,
                    offsetDistance,
                    offsetRotate: props.rotate ? "auto" : "0deg",
                    zIndex: rolling ? zIndex : undefined,
                    willChange: "offset-distance",
                    backfaceVisibility: "hidden",
                    cursor: props.grab ? "inherit" : "pointer",
                } as any
            }
        >
            {props.children}
        </motion.div>
    )
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1040
 * @framerIntrinsicHeight 570
 */
export default function MarqueeAlongPath(props: any) {
    const {
        path = DEFAULT_PATH,
        viewBoxWidth = 1040,
        viewBoxHeight = 570,
        showPath = false,
        pathColor = "#999",
        images = [],
        layers = [],
        itemWidth = 56,
        itemHeight = 72,
        radius = 0,
        rotateAlongPath = true,
        speed = 4,
        direction = "normal",
        repeat = 4,
        slowdownOnHover = true,
        slowDownFactor = 0.3,
        draggable = true,
        dragSensitivity = 0.01,
        dragVelocityDecay = 0.98,
        dragAwareDirection = true,
        useScrollVelocity = true,
        scrollAwareDirection = true,
        rollingZIndex = true,
        clip = false,
        style,
    } = props

    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [fit, setFit] = useState<{ scale: number; x: number; y: number } | null>(null)

    // Scale the viewBox box to fit the component frame, centred.
    useEffect(() => {
        const el = wrapperRef.current
        if (!el) return
        const update = () => {
            const w = el.clientWidth
            const h = el.clientHeight
            if (!w || !h) return
            const scale = Math.min(w / viewBoxWidth, h / viewBoxHeight)
            setFit({
                scale,
                x: (w - viewBoxWidth * scale) / 2,
                y: (h - viewBoxHeight * scale) / 2,
            })
        }
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [viewBoxWidth, viewBoxHeight])

    // Content: connected layers win, otherwise images, otherwise defaults.
    const nodes = useMemo(() => {
        const custom = React.Children.toArray(layers).filter(React.isValidElement) as React.ReactElement<any>[]
        if (custom.length) {
            return custom.map((el) =>
                React.cloneElement(el, {
                    style: { ...(el.props.style || {}), width: "100%", height: "100%" },
                })
            )
        }
        const list = images && images.length ? images : DEFAULT_IMAGES
        return list.map((img: any, i: number) => (
            <img
                key={i}
                src={img?.src}
                srcSet={img?.srcSet}
                alt={img?.alt || ""}
                draggable={false}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: radius,
                    userSelect: "none",
                }}
            />
        ))
    }, [layers, images, radius])

    const entries = useMemo(() => {
        const count = Math.max(1, Math.round(repeat))
        return nodes.flatMap((child: React.ReactNode, childIndex: number) =>
            Array.from({ length: count }, (_, repeatIndex) => ({
                child,
                repeatIndex,
                index: repeatIndex * nodes.length + childIndex,
                key: `${childIndex}-${repeatIndex}`,
            }))
        )
    }, [nodes, repeat])

    // Motion state
    const baseOffset = useMotionValue(0)
    const { scrollY } = useScroll()
    const scrollVelocity = useVelocity(scrollY)
    const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 })
    const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false })

    const hoverFactor = useMotionValue(1)
    const smoothHoverFactor = useSpring(hoverFactor, { damping: 50, stiffness: 400 })

    const isHovered = useRef(false)
    const isDragging = useRef(false)
    const dragVelocity = useRef(0)
    const directionFactor = useRef(direction === "normal" ? 1 : -1)
    const lastPointer = useRef({ x: 0, y: 0 })

    useEffect(() => {
        directionFactor.current = direction === "normal" ? 1 : -1
    }, [direction])

    useAnimationFrame((_, delta) => {
        if (isCanvas) return

        if (isDragging.current && draggable) {
            baseOffset.set(baseOffset.get() + dragVelocity.current)
            dragVelocity.current *= 0.9
            if (Math.abs(dragVelocity.current) < 0.01) dragVelocity.current = 0
            return
        }

        hoverFactor.set(isHovered.current && slowdownOnHover ? slowDownFactor : 1)

        let moveBy =
            directionFactor.current * speed * (delta / 1000) * smoothHoverFactor.get()

        const vf = useScrollVelocity ? velocityFactor.get() : 0
        if (scrollAwareDirection && useScrollVelocity) {
            if (vf < 0) directionFactor.current = -1
            else if (vf > 0) directionFactor.current = 1
        }
        moveBy += directionFactor.current * moveBy * vf

        if (draggable) {
            moveBy += dragVelocity.current
            if (dragAwareDirection && Math.abs(dragVelocity.current) > 0.1) {
                directionFactor.current = Math.sign(dragVelocity.current)
            }
            if (Math.abs(dragVelocity.current) > 0.01) {
                dragVelocity.current *= dragVelocityDecay
            } else {
                dragVelocity.current = 0
            }
        }

        baseOffset.set(baseOffset.get() + moveBy)
    })

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!draggable) return
        e.currentTarget.setPointerCapture(e.pointerId)
        e.currentTarget.style.cursor = "grabbing"
        isDragging.current = true
        lastPointer.current = { x: e.clientX, y: e.clientY }
        dragVelocity.current = 0
    }

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!draggable || !isDragging.current) return
        const dx = e.clientX - lastPointer.current.x
        const dy = e.clientY - lastPointer.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        dragVelocity.current = (dx > 0 ? dist : -dist) * dragSensitivity
        lastPointer.current = { x: e.clientX, y: e.clientY }
    }

    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!draggable) return
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId)
        }
        e.currentTarget.style.cursor = "grab"
        isDragging.current = false
    }

    return (
        <div
            ref={wrapperRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: clip ? "hidden" : "visible",
                cursor: draggable ? "grab" : undefined,
                touchAction: draggable ? "pan-y" : undefined,
                userSelect: "none",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: viewBoxWidth,
                    height: viewBoxHeight,
                    transformOrigin: "top left",
                    transform: fit
                        ? `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})`
                        : undefined,
                    visibility: fit ? "visible" : "hidden",
                    contain: "layout style",
                }}
            >
                {showPath && (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={viewBoxWidth}
                        height={viewBoxHeight}
                        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                        style={{ position: "absolute", inset: 0, overflow: "visible" }}
                    >
                        <path d={path} stroke={pathColor} fill="none" />
                    </svg>
                )}
                {entries.map((entry) => (
                    <PathItem
                        key={entry.key}
                        baseOffset={baseOffset}
                        index={entry.index}
                        total={entries.length}
                        path={path}
                        rolling={rollingZIndex}
                        zBase={1}
                        zRange={10}
                        rotate={rotateAlongPath}
                        width={itemWidth}
                        height={itemHeight}
                        grab={draggable}
                        hidden={entry.repeatIndex > 0}
                        onEnter={() => (isHovered.current = true)}
                        onLeave={() => (isHovered.current = false)}
                    >
                        {entry.child}
                    </PathItem>
                ))}
            </div>
        </div>
    )
}

addPropertyControls(MarqueeAlongPath, {
    images: {
        type: ControlType.Array,
        title: "Images",
        control: { type: ControlType.ResponsiveImage },
        maxCount: 30,
    },
    layers: {
        type: ControlType.Array,
        title: "Layers",
        description: "Optional. Connected layers replace the images.",
        control: { type: ControlType.ComponentInstance },
        maxCount: 30,
    },
    itemWidth: { type: ControlType.Number, title: "Item W", defaultValue: 56, min: 8, max: 400, step: 1, displayStepper: true },
    itemHeight: { type: ControlType.Number, title: "Item H", defaultValue: 72, min: 8, max: 400, step: 1, displayStepper: true },
    radius: { type: ControlType.Number, title: "Radius", defaultValue: 0, min: 0, max: 200, step: 1 },
    repeat: { type: ControlType.Number, title: "Repeat", defaultValue: 4, min: 1, max: 12, step: 1, displayStepper: true },
    rotateAlongPath: { type: ControlType.Boolean, title: "Rotate", defaultValue: true, enabledTitle: "Follow", disabledTitle: "Upright" },
    path: {
        type: ControlType.String,
        title: "Path",
        description: "SVG path d string, in view box units.",
        displayTextArea: true,
        defaultValue: DEFAULT_PATH,
    },
    viewBoxWidth: { type: ControlType.Number, title: "Box W", defaultValue: 1040, min: 1, max: 10000, step: 1 },
    viewBoxHeight: { type: ControlType.Number, title: "Box H", defaultValue: 570, min: 1, max: 10000, step: 1 },
    showPath: { type: ControlType.Boolean, title: "Show Path", defaultValue: false },
    pathColor: { type: ControlType.Color, title: "Path Color", defaultValue: "#999", hidden: (p: any) => !p.showPath },
    speed: { type: ControlType.Number, title: "Speed", defaultValue: 4, min: 0, max: 50, step: 0.5, description: "Percent of the path per second." },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        options: ["normal", "reverse"],
        optionTitles: ["Forward", "Reverse"],
        defaultValue: "normal",
        displaySegmentedControl: true,
    },
    slowdownOnHover: { type: ControlType.Boolean, title: "Hover Slow", defaultValue: true },
    slowDownFactor: { type: ControlType.Number, title: "Slow Factor", defaultValue: 0.3, min: 0, max: 1, step: 0.05, hidden: (p: any) => !p.slowdownOnHover },
    draggable: { type: ControlType.Boolean, title: "Draggable", defaultValue: true },
    dragSensitivity: { type: ControlType.Number, title: "Drag Sens.", defaultValue: 0.01, min: 0.001, max: 1, step: 0.001, hidden: (p: any) => !p.draggable },
    dragVelocityDecay: { type: ControlType.Number, title: "Drag Decay", defaultValue: 0.98, min: 0.5, max: 0.999, step: 0.001, hidden: (p: any) => !p.draggable },
    dragAwareDirection: { type: ControlType.Boolean, title: "Drag Flips", defaultValue: true, hidden: (p: any) => !p.draggable },
    useScrollVelocity: { type: ControlType.Boolean, title: "Scroll Speed", defaultValue: true },
    scrollAwareDirection: { type: ControlType.Boolean, title: "Scroll Flips", defaultValue: true, hidden: (p: any) => !p.useScrollVelocity },
    rollingZIndex: { type: ControlType.Boolean, title: "Rolling Z", defaultValue: true },
    clip: { type: ControlType.Boolean, title: "Clip", defaultValue: false },
})
