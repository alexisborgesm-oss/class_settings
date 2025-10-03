import React, { useState } from 'react'

const ImageCarousel: React.FC<{ urls: string[] }> = ({ urls }) => {
  const [idx, setIdx] = useState(0)
  if (!urls.length) return <div className="small">No hay imágenes disponibles.</div>

  const prev = () => setIdx(i => (i===0?urls.length-1:i-1))
  const next = () => setIdx(i => (i===urls.length-1?0:i+1))

  return (
    <div className="carousel">
      <div className="carousel-image-wrapper">
        <img
          src={urls[idx]}
          alt={`Imagen ${idx+1}`}
          className="carousel-image"
        />
      </div>
      {urls.length > 1 && (
        <div className="carousel-controls">
          <button className="btn" onClick={prev}>‹</button>
          <span>{idx+1}/{urls.length}</span>
          <button className="btn" onClick={next}>›</button>
        </div>
      )}
    </div>
  )
}

export default ImageCarousel
