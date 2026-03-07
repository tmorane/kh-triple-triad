import { listAllPublicImages } from './publicGalleryStore'

interface NodeRequestLike {
  method?: string
}

interface NodeResponseLike {
  status: (code: number) => NodeResponseLike
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

export default async function handler(req: NodeRequestLike, res: NodeResponseLike): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const images = await listAllPublicImages()
    res.status(200).json({ images })
  } catch {
    res.status(500).json({ error: 'Unable to read public gallery.' })
  }
}

