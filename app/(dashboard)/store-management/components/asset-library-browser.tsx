'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Upload, Trash2, Image as ImageIcon, Search, X } from 'lucide-react'
import {
  getTemplateAssets,
  uploadTemplateAsset,
  deleteTemplateAsset,
} from '@/lib/actions/pdf-templates'

interface Asset {
  id: string
  name: string
  description?: string
  asset_type: 'background' | 'decorative' | 'logo' | 'border'
  file_url: string
  file_size?: number
  width?: number
  height?: number
  tags?: string[]
  created_at?: string
}

interface AssetLibraryBrowserProps {
  onSelectAsset?: (asset: Asset) => void
  allowMultiple?: boolean
  filterType?: 'background' | 'decorative' | 'logo' | 'border'
}

export function AssetLibraryBrowser({
  onSelectAsset,
  allowMultiple = false,
  filterType,
}: AssetLibraryBrowserProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<string>(filterType || 'all')
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    loadAssets()
  }, [])

  useEffect(() => {
    filterAssets()
  }, [assets, searchQuery, activeTab])

  const loadAssets = async () => {
    setIsLoading(true)
    const result = await getTemplateAssets()
    if (result.success && result.data) {
      setAssets(result.data)
    } else {
      toast.error(result.error || 'Failed to load assets')
    }
    setIsLoading(false)
  }

  const filterAssets = () => {
    let filtered = assets

    // Filter by type
    if (activeTab !== 'all') {
      filtered = filtered.filter((asset) => asset.asset_type === activeTab)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(query) ||
          asset.description?.toLowerCase().includes(query) ||
          asset.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    setFilteredAssets(filtered)
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const file = files[0]

    try {
      const result = await uploadTemplateAsset(
        file,
        activeTab as 'background' | 'decorative' | 'logo' | 'border',
        {
          name: file.name,
        }
      )

      if (result.success) {
        toast.success('Asset uploaded successfully')
        loadAssets()
        setUploadDialogOpen(false)
      } else {
        toast.error(result.error || 'Failed to upload asset')
      }
    } catch (error) {
      toast.error('An error occurred while uploading')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    const result = await deleteTemplateAsset(assetId)
    if (result.success) {
      toast.success('Asset deleted successfully')
      loadAssets()
    } else {
      toast.error(result.error || 'Failed to delete asset')
    }
  }

  const handleSelect = (asset: Asset) => {
    if (allowMultiple) {
      const newSelected = new Set(selectedAssets)
      if (newSelected.has(asset.id)) {
        newSelected.delete(asset.id)
      } else {
        newSelected.add(asset.id)
      }
      setSelectedAssets(newSelected)
    } else {
      onSelectAsset?.(asset)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  const getAssetTypeBadge = (type: string) => {
    const colors = {
      background: 'bg-blue-100 text-blue-700',
      decorative: 'bg-purple-100 text-purple-700',
      logo: 'bg-green-100 text-green-700',
      border: 'bg-orange-100 text-orange-700',
    }
    return (
      <Badge className={colors[type as keyof typeof colors] || colors.background}>
        {type}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">Loading assets...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets by name, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-1/2 transform -translate-y-1/2"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Template Asset</DialogTitle>
              <DialogDescription>
                Upload an image to use in your PDF templates
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Asset Type</Label>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="background">Background</TabsTrigger>
                    <TabsTrigger value="decorative">Decorative</TabsTrigger>
                    <TabsTrigger value="logo">Logo</TabsTrigger>
                    <TabsTrigger value="border">Border</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div>
                <Label>Choose File</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={isUploading}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Supported formats: JPG, PNG, SVG (max 5MB)
                </p>
              </div>
              {isUploading && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Assets ({assets.length})</TabsTrigger>
          <TabsTrigger value="background">
            Backgrounds ({assets.filter((a) => a.asset_type === 'background').length})
          </TabsTrigger>
          <TabsTrigger value="decorative">
            Decorative ({assets.filter((a) => a.asset_type === 'decorative').length})
          </TabsTrigger>
          <TabsTrigger value="logo">
            Logos ({assets.filter((a) => a.asset_type === 'logo').length})
          </TabsTrigger>
          <TabsTrigger value="border">
            Borders ({assets.filter((a) => a.asset_type === 'border').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">No assets found</p>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Upload your first asset to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <Card
              key={asset.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedAssets.has(asset.id) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleSelect(asset)}
            >
              <CardContent className="p-0">
                {/* Image Preview */}
                <div className="relative h-40 bg-gray-100 rounded-t-lg overflow-hidden">
                  <img
                    src={asset.file_url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    {getAssetTypeBadge(asset.asset_type)}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute bottom-2 right-2 opacity-0 hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(asset.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Asset Info */}
                <div className="p-3 space-y-1">
                  <h4 className="font-medium text-sm truncate">{asset.name}</h4>
                  {asset.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {asset.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatFileSize(asset.file_size)}</span>
                    {asset.width && asset.height && (
                      <span>
                        {asset.width} × {asset.height}
                      </span>
                    )}
                  </div>
                  {asset.tags && asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {asset.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {asset.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{asset.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selection Summary (for multiple selection) */}
      {allowMultiple && selectedAssets.size > 0 && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg">
          <p className="text-sm font-medium">
            {selectedAssets.size} asset{selectedAssets.size > 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectedAssets(new Set())}
            >
              Clear
            </Button>
            <Button size="sm" onClick={() => {}}>
              Use Selected
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
