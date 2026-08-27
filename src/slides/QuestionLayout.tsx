import type { ReactNode } from 'react'

interface QuestionLayoutProps {
  image: string
  caption: string
  children: ReactNode
}

/**
 * The shared frame for every question and the bonus. The photo lives here, one
 * level above the changing content, so its pan keeps running from slide to
 * slide instead of restarting.
 */
export function QuestionLayout({ image, caption, children }: QuestionLayoutProps) {
  return (
    <section className="slide question">
      {children}

      <figure className="question__figure">
        <img src={image} alt="" draggable={false} />
        <figcaption className="micro micro--light">{caption}</figcaption>
      </figure>
    </section>
  )
}
