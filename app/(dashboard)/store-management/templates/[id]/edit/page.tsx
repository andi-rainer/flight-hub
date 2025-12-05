import { Metadata } from 'next'
import { TemplateEditorPage } from './template-editor-page'

export const metadata: Metadata = {
  title: 'Edit Template',
  description: 'Edit PDF template design',
}

interface PageProps {
  params: {
    id: string
  }
}

export default function EditTemplatePage({ params }: PageProps) {
  return <TemplateEditorPage templateId={params.id} />
}
