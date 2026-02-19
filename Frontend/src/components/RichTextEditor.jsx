import { useMemo, useRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { uploadImage } from '../lib/api'

/**
 * Rich text editor for writer stories.
 * Supports headings, basic formatting, colors, lists, links, and inline images.
 */
export default function RichTextEditor({ value, onChange, placeholder = 'Write your story here…' }) {
  const quillRef = useRef(null)

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: {
          image: handleInsertImage,
        },
      },
    }),
    []
  )

  async function handleInsertImage() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const { url } = await uploadImage(file)
        const quill = quillRef.current?.getEditor()
        if (!quill || !url) return
        const range = quill.getSelection(true)
        quill.insertEmbed(range ? range.index : 0, 'image', url, 'user')
        if (range) quill.setSelection(range.index + 1, 0)
      } catch {
        // silently ignore upload errors for now
      }
    }
    input.click()
  }

  return (
    <div className="border border-stone-200 rounded-2xl bg-white shadow-sm overflow-hidden">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        className="rich-text-editor"
      />
    </div>
  )
}

