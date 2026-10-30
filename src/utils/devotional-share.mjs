export function devotionalShare(entry) {
  const url = `https://www.christreformationhouse.org.ng/devotional/${entry.publicationDate}`
  const caption = `${entry.title}\n${entry.memoryReference}: ${entry.memoryVerse}\n\n${entry.socialSummary || ''}\n\nRead and pray with Christ’s Reformation House Int’l Inc.\n${url}`
  return { url, caption, whatsapp:`https://wa.me/?text=${encodeURIComponent(caption)}`,facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` }
}
export async function downloadVerseCard(entry) {
  const canvas = document.createElement('canvas');canvas.width=1080;canvas.height=1080
  const ctx = canvas.getContext('2d');if(!ctx)throw new Error('Card unavailable')
  ctx.fillStyle='#153c32';ctx.fillRect(0,0,1080,1080)
  ctx.strokeStyle='#c9a56c';ctx.lineWidth=3;ctx.strokeRect(42,42,996,996)
  ctx.fillStyle='#e2c99a';ctx.font='bold 23px sans-serif';ctx.fillText('CHRIST’S REFORMATION HOUSE INT’L INC.',80,110)
  ctx.fillStyle='#ffffff';ctx.font='bold 48px Georgia'
  function lines(text,y,fontHeight,maxLines) {
    const words=String(text).replace(/\s+/g,' ').split(' ');let line='',row=0
    for(const word of words){const next=line?`${line} ${word}`:word
      if(ctx.measureText(next).width>900 && line){ctx.fillText(line,80,y+row*fontHeight);row++;line=word;if(row>=maxLines-1)break}else line=next
    }
    ctx.fillText(row>=maxLines-1?line+'…':line,80,y+row*fontHeight);return y+(row+1)*fontHeight
  }
  let y=lines(entry.title,205,62,3)+30
  ctx.font='32px Georgia';y=lines(entry.memoryVerse,y,49,9)+24
  ctx.fillStyle='#e2c99a';ctx.font='bold 26px sans-serif';ctx.fillText(`${entry.memoryReference} (${entry.translation || 'KJV'})`,80,Math.min(y,900))
  ctx.font='23px sans-serif';ctx.fillText(`${entry.publicationDate} · Day ${entry.dayNumber}`,80,960)
  ctx.font='20px sans-serif';ctx.fillText('christreformationhouse.org.ng/devotional',80,1000)
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Card unavailable')
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`crh-devotional-${entry.publicationDate}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)
}
