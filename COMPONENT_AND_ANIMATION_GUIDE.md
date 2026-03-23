# Production UI Components & Animation Guide

A comprehensive guide to using the new premium UI/UX components and design system.

---

## 📦 New Components

### 1. **PageWrapper** - Page Entry Animations
```jsx
import PageWrapper from '../components/PageWrapper.jsx';

export default function MyPage() {
  return (
    <PageWrapper>
      <main>
        {/* Page content here - automatically fades in and slides up */}
      </main>
    </PageWrapper>
  );
}
```

**Features:**
- Initial: Fade in (0 → 1) + Slide up (20px ↓ → 0px)
- Duration: 300ms
- Easing: `easeInOut`

---

### 2. **ScrollProgressBar** - Reading Progress Indicator
```jsx
import ScrollProgressBar from '../components/ScrollProgressBar.jsx';

export default function Article() {
  return (
    <>
      <ScrollProgressBar />
      <article>{/* content */}</article>
    </>
  );
}
```

**Features:**
- Shows scroll progress bar at top
- Gradient color (brand-400 → brand-600)
- Appears after 0.5% scroll
- Smooth 300ms transition
- ARIA accessible

---

### 3. **AnimatedLikeButton** - Spring Physics Button
```jsx
import AnimatedLikeButton from '../components/AnimatedLikeButton.jsx';

export default function Post() {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(42);

  const handleLike = () => {
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);
  };

  return (
    <AnimatedLikeButton
      liked={liked}
      count={count}
      label="Like"
      onClick={handleLike}
    />
  );
}
```

**Features:**
- Spring animation on state change (bouncy preset)
- Hover: scale 1.05
- Tap: scale 0.95
- Color changes based on liked state

---

### 4. **AnimatedCard** - Hover Lift Effect
```jsx
import AnimatedCard from '../components/AnimatedCard.jsx';

export default function CardList() {
  return (
    <div className="grid gap-6">
      {posts.map(post => (
        <AnimatedCard 
          key={post.id}
          className="card p-6"
          onClick={() => navigate(`/posts/${post.slug}`)}
        >
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
        </AnimatedCard>
      ))}
    </div>
  );
}
```

**Features:**
- Hover: Lifts up 4px (y: -4)
- Spring animation
- Customizable hover behavior

---

### 5. **BlurToSharpImage** - Progressive Image Loading
```jsx
import BlurToSharpImage from '../components/BlurToSharpImage.jsx';

export default function Post() {
  return (
    <BlurToSharpImage
      src="https://example.com/image.jpg"
      alt="Post cover"
      className="w-full h-96 object-cover rounded-xl"
      containerClassName="mb-8"
    />
  );
}
```

**Features:**
- Shows blurred placeholder while loading
- Smooth 300ms fade to sharp image
- Lazy loading support
- No layout shift

---

## 🎬 Animation Utilities

### Animation System (`utils/animations.js`)

#### Spring Presets
```javascript
import { springPresets } from '../utils/animations.js';

// Gentle spring (for subtle effects)
springPresets.gentle // { damping: 25, stiffness: 300, mass: 1 }

// Bouncy spring (playful feedback)
springPresets.bouncy // { damping: 15, stiffness: 300, mass: 1 }

// Snappy spring (responsive feel)
springPresets.snappy // { damping: 20, stiffness: 400, mass: 0.8 }
```

#### Motion Variants
```javascript
import { motionVariants } from '../utils/animations.js';

// Use with Framer Motion
<motion.div
  variants={motionVariants.scaleIn}
  initial="hidden"
  animate="visible"
>
  Content
</motion.div>

// Available variants:
// - scaleIn: fade + scale 0.95 → 1
// - slideInUp: fade + y 20px ↓ → 0
// - slideInDown: fade + y -20px ↑ → 0
// - fadeIn: simple opacity fade
// - staggerContainer: for staggered lists
```

---

## 📏 Design System Usage

### Spacing
```jsx
// Use consistent spacing scale
className="p-6 gap-4 mb-8 mt-12"

// Tailwind generates automatically:
p-xs (4px) → p-3xl (64px)
gap-xs → gap-3xl
m-xs → m-3xl
```

### Typography
```jsx
// Font sizes with built-in line heights
/* 
  text-xs:   12px / 1.5rem
  text-sm:   14px / 1.5rem  
  text-base: 16px / 1.5rem
  text-lg:   18px / 1.75rem
  text-xl:   20px / 1.75rem
  text-2xl:  24px / 2rem
  text-3xl:  32px / 2.25rem
  text-4xl:  40px / 2.75rem
  text-5xl:  48px / 3rem
*/

// Line heights
className="leading-tight"     // 1.2 (headlines)
className="leading-snug"      // 1.4
className="leading-normal"    // 1.6 (body)
className="leading-relaxed"   // 1.8
className="leading-loose"     // 2.0
className="leading-prose"     // 1.75 (articles)

// Max widths
className="max-w-prose"   // 65ch (perfect for reading)
className="max-w-content" // 820px (article width)
```

### Colors & Theming
```jsx
// Colors automatically adapt to light/dark mode
// via CSS custom properties

// Primary text
className="text-[rgb(var(--text-primary))]"

// Secondary text (muted)
className="text-[rgb(var(--text-secondary))]"

// Brand colors
className="text-brand-400"  // Light
className="text-brand-600"  // Medium
className="text-brand-900"  // Dark

// Surface colors
className="bg-surface"      // Background
className="bg-surface-raised" // Cards
className="border-surface-border" // Borders
```

---

## 🎯 Common Patterns

### Article Page Layout
```jsx
import PageWrapper from '../components/PageWrapper.jsx';
import ScrollProgressBar from '../components/ScrollProgressBar.jsx';

export default function Article() {
  return (
    <>
      <ScrollProgressBar />
      <PageWrapper>
        <main className="min-h-screen">
          {/* Header with max-w-content */}
          <article className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1>Title</h1>
            <div className="text-[rgb(var(--text-secondary))]">Metadata</div>
          </article>

          {/* Image */}
          <BlurToSharpImage className="w-full" />

          {/* Content centered */}
          <article className="max-w-content mx-auto px-4 article-content">
            {/* Content auto-styled */}
          </article>
        </main>
      </PageWrapper>
    </>
  );
}
```

### Post Card with Animations
```jsx
import AnimatedCard from '../components/AnimatedCard.jsx';

export default function PostCard({ post }) {
  return (
    <AnimatedCard className="post-card">
      {post.cover_image && (
        <img 
          src={post.cover_image} 
          className="post-card-img-wrapper"
        />
      )}
      <h2 className="newsroom-title">{post.title}</h2>
      <p className="text-[rgb(var(--text-secondary))]">{post.excerpt}</p>
      
      <div className="flex gap-4 mt-auto pt-4">
        <AnimatedLikeButton
          liked={post.liked}
          count={post.likes_count}
          label="Like"
          onClick={handleLike}
        />
      </div>
    </AnimatedCard>
  );
}
```

---

## 🎨 Animation Best Practices

### 1. Duration Guidelines
```javascript
// Micro-interactions: 200-300ms
whileTap={{ scale: 0.95 }}
transition={{ duration: 0.2 }}

// Page transitions: 300-500ms
transition={{ duration: 0.3 }}

// Complex animations: ≤ 1000ms (never > 1s)
transition={{ duration: 0.6 }}
```

### 2. Use Spring Physics
```javascript
// For natural-feeling motion, prefer springs

// Gentle feel
transition={{
  type: 'spring',
  damping: 25,
  stiffness: 300
}}

// Bouncy/playful feel
transition={{
  type: 'spring',
  damping: 15,
  stiffness: 300
}}

// Never use linear easing for interactions
// Use ease-out, ease-in-out, or springs
```

### 3. When NOT to Animate
- ❌ Page loads (use skeleton loaders)
- ❌ Data loading (use spinners)
- ❌ Form validation (use color/border changes)
- ❌ Critical actions (immediate response needed)
- ❌ Reduced motion preference (always respect)

---

## ♿ Accessibility Notes

### Respect Prefers-Reduced-Motion
```javascript
import { useReducedMotion } from 'framer-motion';

function MyComponent() {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={
        shouldReduceMotion 
          ? { duration: 0 }  // No animation
          : { duration: 0.3 }
      }
    >
      Content
    </motion.div>
  );
}
```

### ARIA Labels
```jsx
// Always add ARIA labels to animations
<motion.button
  whileTap={{ scale: 0.95 }}
  aria-label="Like post"
  role="button"
>
  ♥ Like
</motion.button>
```

---

## 🚀 Implementation Checklist

- [ ] Wrap pages with `PageWrapper` for transitions
- [ ] Add `ScrollProgressBar` to article pages
- [ ] Replace like buttons with `AnimatedLikeButton`
- [ ] Use `AnimatedCard` for post cards
- [ ] Use `BlurToSharpImage` for post images
- [ ] Test animations on low-end devices
- [ ] Verify `prefers-reduced-motion` support
- [ ] Check accessibility with screen readers
- [ ] Monitor bundle size (Framer Motion ~40KB)
- [ ] Performance audit (Core Web Vitals)

---

## 📊 Performance Metrics

After implementing:
- **LCP:** Should remain < 2.5s
- **FCP:** Should remain < 1.8s
- **CLS:** Should remain < 0.1
- **Bundle Size:** +~40KB (Framer Motion)

Monitor in production with:
- Chrome DevTools Performance tab
- Lighthouse audits
- Web Vitals monitoring
- User Experience metrics

---

## 🎓 Framer Motion Resources

- [Official Docs](https://www.framer.com/motion/)
- [Animation Guide](https://www.framer.com/motion-start/)
- [Spring Configuration](https://www.framer.com/motion-spring-config/)
- [Gesture Animations](https://www.framer.com/motion-gestures/)

---

Generated: March 23, 2026

