
import React, { useState } from 'react'

const ImageCarousel: React.FC<{ urls: string[] }> = ({ urls }) => {
  const [idx, setIdx] = useState(0)
  if (!urls.length) return <div className="small">No hay imagenes.</div>
  const prev = () => setIdx((i)=> (i - 1 + urls.length) % urls.length)
  const next = () => setIdx((i)=> (i + 1) % urls.length)
  return (
    <div className="carousel">
      <button className="btn" onClick={prev}>&larr;</button>
      <img src={urls[idx]} alt={`img-${idx}`} />
      <button className="btn" onClick={next}>&rarr;</button>
      <span className="small"> {idx+1} / {urls.length}</span>
    </div>
  )
}
export default ImageCarousel
