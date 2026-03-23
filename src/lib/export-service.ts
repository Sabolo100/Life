import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import type { LifeStory, Person, LifeEvent, Location, TimePeriod, Emotion, OpenQuestion } from '@/types'

export interface ExportData {
  lifeStory: LifeStory | null
  persons: Person[]
  events: LifeEvent[]
  locations: Location[]
  timePeriods: TimePeriod[]
  emotions: Emotion[]
  openQuestions: OpenQuestion[]
  displayName?: string
}

function getFileName(displayName?: string) {
  const name = displayName || 'eletut'
  const date = new Date().toISOString().slice(0, 10)
  return `eletut_${name}_${date}`
}

function getEventTimeLabel(event: LifeEvent): string {
  if (event.exact_date) return event.exact_date
  if (event.estimated_year) return `~${event.estimated_year}`
  if (event.life_phase) return event.life_phase
  if (event.uncertain_time) return event.uncertain_time
  return 'Ismeretlen időpont'
}

function sortEventsByTime(events: LifeEvent[]): LifeEvent[] {
  return [...events].sort((a, b) => {
    const yearA = a.estimated_year ?? (a.exact_date ? new Date(a.exact_date).getFullYear() : 9999)
    const yearB = b.estimated_year ?? (b.exact_date ? new Date(b.exact_date).getFullYear() : 9999)
    return yearA - yearB
  })
}

// ---- JSON Export ----

export function exportAsJSON(data: ExportData) {
  const exportObj = {
    exportDate: new Date().toISOString(),
    lifeStory: data.lifeStory,
    persons: data.persons,
    events: data.events,
    locations: data.locations,
    timePeriods: data.timePeriods,
    emotions: data.emotions,
    openQuestions: data.openQuestions,
  }

  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${getFileName(data.displayName)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---- PDF Export ----

export function exportAsPDF(data: ExportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = 20

  const checkPageBreak = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage()
      y = 20
    }
  }

  const addTitle = (text: string) => {
    checkPageBreak(15)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    y += 10
  }

  const addSectionHeader = (text: string) => {
    checkPageBreak(15)
    y += 5
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    y += 8
  }

  const addText = (text: string) => {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(text, contentWidth)
    for (const line of lines) {
      checkPageBreak(6)
      doc.text(line, margin, y)
      y += 5
    }
    y += 2
  }

  const addSmallText = (text: string) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(text, contentWidth)
    for (const line of lines) {
      checkPageBreak(5)
      doc.text(line, margin, y)
      y += 4.5
    }
  }

  // Title
  const title = `Eletut - ${data.displayName || 'Eletutam'}`
  addTitle(title)

  // Life story (from event narrative_text fields)
  const sortedNarrativeEvents = sortEventsByTime(data.events)
  const narrativeParagraphs = sortedNarrativeEvents
    .map(e => e.narrative_text || e.description)
    .filter(Boolean) as string[]
  if (narrativeParagraphs.length > 0) {
    addSectionHeader('Elettortenet')
    addText(narrativeParagraphs.join('\n\n'))
  }

  // Persons
  if (data.persons.length > 0) {
    addSectionHeader('Szemelyek')
    for (const person of data.persons) {
      checkPageBreak(12)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      const nameLabel = person.nickname ? `${person.name} (${person.nickname})` : person.name
      doc.text(`${nameLabel} - ${person.relationship_type}`, margin, y)
      y += 5
      if (person.notes) {
        addSmallText(person.notes)
      }
      if (person.related_period) {
        addSmallText(`Idoszak: ${person.related_period}`)
      }
      y += 2
    }
  }

  // Events (sorted chronologically)
  if (data.events.length > 0) {
    addSectionHeader('Esemenyek')
    const sorted = sortEventsByTime(data.events)
    for (const event of sorted) {
      checkPageBreak(15)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      const turningPoint = event.is_turning_point ? ' [Fordulópont]' : ''
      doc.text(`${event.title} (${event.category})${turningPoint}`, margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      addSmallText(`Ido: ${getEventTimeLabel(event)}`)
      if (event.description) {
        addSmallText(event.description)
      }
      y += 2
    }
  }

  // Locations
  if (data.locations.length > 0) {
    addSectionHeader('Helyszinek')
    for (const loc of data.locations) {
      checkPageBreak(10)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`${loc.name} (${loc.type})`, margin, y)
      y += 5
      if (loc.notes) {
        addSmallText(loc.notes)
      }
      if (loc.related_period) {
        addSmallText(`Idoszak: ${loc.related_period}`)
      }
      y += 2
    }
  }

  // Emotions
  if (data.emotions.length > 0) {
    addSectionHeader('Erzelmek')
    for (const emotion of data.emotions) {
      checkPageBreak(10)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const valenceLabel = emotion.valence === 'positive' ? 'pozitiv' : emotion.valence === 'negative' ? 'negativ' : emotion.valence === 'mixed' ? 'vegyes' : 'semleges'
      doc.text(`${emotion.feeling} (${valenceLabel}, fontossag: ${emotion.importance}/10)`, margin, y)
      y += 5
      if (emotion.long_term_impact) {
        addSmallText(`Hosszu tavu hatas: ${emotion.long_term_impact}`)
      }
      y += 1
    }
  }

  // Save
  doc.save(`${getFileName(data.displayName)}.pdf`)
}

// ---- DOCX Export ----

export async function exportAsDOCX(data: ExportData) {
  const children: Paragraph[] = []

  // Title
  children.push(
    new Paragraph({
      text: `Életút - ${data.displayName || 'Életutam'}`,
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Exportálva: ${new Date().toLocaleDateString('hu-HU')}`, italics: true, size: 20 }),
      ],
      spacing: { after: 400 },
    })
  )

  // Life story (from event narrative_text fields)
  const docxNarrativeEvents = sortEventsByTime(data.events)
  const docxNarratives = docxNarrativeEvents
    .map(e => e.narrative_text || e.description)
    .filter(Boolean) as string[]
  if (docxNarratives.length > 0) {
    children.push(
      new Paragraph({
        text: 'Élettörténet',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )
    for (const text of docxNarratives) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text, size: 22 })],
          spacing: { after: 100 },
        })
      )
    }
  }

  // Persons
  if (data.persons.length > 0) {
    children.push(
      new Paragraph({
        text: 'Személyek',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    const borderStyle = {
      style: BorderStyle.SINGLE,
      size: 1,
      color: 'CCCCCC',
    }
    const borders = {
      top: borderStyle,
      bottom: borderStyle,
      left: borderStyle,
      right: borderStyle,
    }

    const headerRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Név', bold: true, size: 20 })] })], borders }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Becenév', bold: true, size: 20 })] })], borders }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Kapcsolat', bold: true, size: 20 })] })], borders }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Időszak', bold: true, size: 20 })] })], borders }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Megjegyzés', bold: true, size: 20 })] })], borders }),
      ],
    })

    const personRows = data.persons.map(
      person =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: person.name, size: 20 })] })], borders }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: person.nickname || '-', size: 20 })] })], borders }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: person.relationship_type, size: 20 })] })], borders }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: person.related_period || '-', size: 20 })] })], borders }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: person.notes || '-', size: 20 })] })], borders }),
          ],
        })
    )

    const table = new Table({
      rows: [headerRow, ...personRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    })

    children.push(new Paragraph({ spacing: { before: 100 } }))
    // Table is added separately to the doc sections
    // We'll handle this via the section children array
    // For now, add persons as list items and table separately

    // We need to restructure to support tables in the document
    // Let's build sections with mixed content
    const docChildren: (Paragraph | Table)[] = [...children, table]

    // Continue building remaining content and then create the document at the end
    const remainingChildren: (Paragraph | Table)[] = []

    // Events (sorted chronologically)
    if (data.events.length > 0) {
      remainingChildren.push(
        new Paragraph({
          text: 'Események',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      )

      const sorted = sortEventsByTime(data.events)
      for (const event of sorted) {
        const turningPoint = event.is_turning_point ? ' [Fordulópont]' : ''
        remainingChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${event.title}${turningPoint}`, bold: true, size: 22 }),
              new TextRun({ text: ` (${event.category})`, italics: true, size: 20 }),
            ],
            spacing: { before: 200, after: 50 },
          })
        )
        remainingChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Idő: ${getEventTimeLabel(event)}`, size: 20, color: '666666' }),
            ],
            spacing: { after: 50 },
          })
        )
        if (event.description) {
          remainingChildren.push(
            new Paragraph({
              children: [new TextRun({ text: event.description, size: 20 })],
              spacing: { after: 100 },
            })
          )
        }
      }
    }

    // Locations
    if (data.locations.length > 0) {
      remainingChildren.push(
        new Paragraph({
          text: 'Helyszínek',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      )
      for (const loc of data.locations) {
        remainingChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: loc.name, bold: true, size: 22 }),
              new TextRun({ text: ` (${loc.type})`, italics: true, size: 20 }),
            ],
            spacing: { before: 150, after: 50 },
          })
        )
        if (loc.related_period) {
          remainingChildren.push(
            new Paragraph({
              children: [new TextRun({ text: `Időszak: ${loc.related_period}`, size: 20, color: '666666' })],
              spacing: { after: 50 },
            })
          )
        }
        if (loc.notes) {
          remainingChildren.push(
            new Paragraph({
              children: [new TextRun({ text: loc.notes, size: 20 })],
              spacing: { after: 100 },
            })
          )
        }
      }
    }

    // Emotions
    if (data.emotions.length > 0) {
      remainingChildren.push(
        new Paragraph({
          text: 'Érzelmek',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      )
      for (const emotion of data.emotions) {
        const valenceLabel = emotion.valence === 'positive' ? 'pozitív' : emotion.valence === 'negative' ? 'negatív' : emotion.valence === 'mixed' ? 'vegyes' : 'semleges'
        remainingChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: emotion.feeling, bold: true, size: 22 }),
              new TextRun({ text: ` (${valenceLabel}, fontosság: ${emotion.importance}/10)`, size: 20 }),
            ],
            spacing: { before: 150, after: 50 },
          })
        )
        if (emotion.long_term_impact) {
          remainingChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Hosszú távú hatás: ', bold: true, size: 20 }),
                new TextRun({ text: emotion.long_term_impact, size: 20 }),
              ],
              spacing: { after: 100 },
            })
          )
        }
      }
    }

    const document = new Document({
      sections: [
        {
          children: [...docChildren, ...remainingChildren],
        },
      ],
    })

    const blob = await Packer.toBlob(document)
    saveAs(blob, `${getFileName(data.displayName)}.docx`)
    return
  }

  // If no persons, simpler document structure (no table needed)
  // Events
  if (data.events.length > 0) {
    children.push(
      new Paragraph({
        text: 'Események',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )
    const sorted = sortEventsByTime(data.events)
    for (const event of sorted) {
      const turningPoint = event.is_turning_point ? ' [Fordulópont]' : ''
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${event.title}${turningPoint}`, bold: true, size: 22 }),
            new TextRun({ text: ` (${event.category})`, italics: true, size: 20 }),
          ],
          spacing: { before: 200, after: 50 },
        })
      )
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Idő: ${getEventTimeLabel(event)}`, size: 20, color: '666666' })],
          spacing: { after: 50 },
        })
      )
      if (event.description) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: event.description, size: 20 })],
            spacing: { after: 100 },
          })
        )
      }
    }
  }

  // Locations
  if (data.locations.length > 0) {
    children.push(
      new Paragraph({
        text: 'Helyszínek',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )
    for (const loc of data.locations) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: loc.name, bold: true, size: 22 }),
            new TextRun({ text: ` (${loc.type})`, italics: true, size: 20 }),
          ],
          spacing: { before: 150, after: 50 },
        })
      )
      if (loc.related_period) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `Időszak: ${loc.related_period}`, size: 20, color: '666666' })],
            spacing: { after: 50 },
          })
        )
      }
      if (loc.notes) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: loc.notes, size: 20 })],
            spacing: { after: 100 },
          })
        )
      }
    }
  }

  // Emotions
  if (data.emotions.length > 0) {
    children.push(
      new Paragraph({
        text: 'Érzelmek',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )
    for (const emotion of data.emotions) {
      const valenceLabel = emotion.valence === 'positive' ? 'pozitív' : emotion.valence === 'negative' ? 'negatív' : emotion.valence === 'mixed' ? 'vegyes' : 'semleges'
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: emotion.feeling, bold: true, size: 22 }),
            new TextRun({ text: ` (${valenceLabel}, fontosság: ${emotion.importance}/10)`, size: 20 }),
          ],
          spacing: { before: 150, after: 50 },
        })
      )
      if (emotion.long_term_impact) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Hosszú távú hatás: ', bold: true, size: 20 }),
              new TextRun({ text: emotion.long_term_impact, size: 20 }),
            ],
            spacing: { after: 100 },
          })
        )
      }
    }
  }

  const document = new Document({
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(document)
  saveAs(blob, `${getFileName(data.displayName)}.docx`)
}
