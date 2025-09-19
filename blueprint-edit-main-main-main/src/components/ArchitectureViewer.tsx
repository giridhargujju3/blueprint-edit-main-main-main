import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";
import sampleArchitecture from "@/assets/sample-architecture.png";
import { DiagramViewer } from "./DiagramViewer";
interface ArchitectureViewerProps {
  imageFile?: File;
  xmlContent?: string;
}

export const ArchitectureViewer = ({ imageFile, xmlContent }: ArchitectureViewerProps) => {
  const [imageUrl, setImageUrl] = useState<string>(sampleArchitecture);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isShowingUpdate, setIsShowingUpdate] = useState(false);

  // Switch to XML view when XML content changes
  useEffect(() => {
    if (xmlContent) {
      setIsShowingUpdate(true);
    }
  }, [xmlContent]);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.25));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const downloadImage = () => {
    if (isShowingUpdate && xmlContent) {
      // For updated version, trigger download of XML
      const blob = new Blob([xmlContent], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'updated-architecture.xml';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // For original version, download the image
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = imageFile?.name || 'architecture-diagram.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Viewer Controls */}
      <div className="flex items-center justify-between mb-4 p-2 bg-secondary/20 rounded">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={isShowingUpdate}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={isShowingUpdate}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={isShowingUpdate}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">
            {Math.round(scale * 100)}%
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {xmlContent && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant={!isShowingUpdate ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setIsShowingUpdate(false)}
              >
                Original
              </Button>
              <Button
                variant={isShowingUpdate ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setIsShowingUpdate(true)}
              >
                Updated
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={downloadImage}>
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Image/XML Viewer */}
      <Card className="flex-1 overflow-hidden bg-gradient-secondary relative">
        <div className="relative w-full h-full">
          {/* Original Image Layer */}
          <div
            className={`absolute inset-0 cursor-move select-none flex items-center justify-center transition-opacity duration-300 ${
              isShowingUpdate ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={imageUrl}
              alt="Original Architecture"
              className="max-w-none transition-transform duration-200 ease-out shadow-xl rounded-lg"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
              draggable={false}
            />
          </div>

          {/* Updated Diagram Layer */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              isShowingUpdate ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {xmlContent ? (
              <DiagramViewer
                key={xmlContent}
                xml={xmlContent}
                className="w-full h-full bg-white rounded-lg shadow-xl"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4 text-sm text-muted-foreground">
                Upload an XML file to preview the updated architecture.
              </div>
            )}
          </div>
        </div>
        
        {/* View Controls */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg flex items-center gap-3">
            <button
              onClick={() => setIsShowingUpdate(false)}
              className={`text-sm px-3 py-1 rounded-md transition-colors ${
                !isShowingUpdate 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-secondary'
              }`}
            >
              Original
            </button>
            <button
              onClick={() => setIsShowingUpdate(true)}
              className={`text-sm px-3 py-1 rounded-md transition-colors ${
                isShowingUpdate 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-secondary'
              }`}
            >
              Updated
            </button>
          </div>
          <div className="bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg text-sm">
            {!isShowingUpdate ? (
              imageFile ? (
                <span className="text-yellow-500">Viewing Original Design</span>
              ) : (
                <span className="text-muted-foreground">Sample Architecture</span>
              )
            ) : (
              <span className="text-green-500">Viewing Updated Design</span>
            )}
          </div>
        </div>
      </Card>

      {/* XML Info & Changes Indicator */}
      {xmlContent && (
        <Card className="mt-4 p-3 bg-secondary/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">XML Data Loaded</span>
            <span className="text-xs text-muted-foreground">
              {xmlContent.length} characters
            </span>
          </div>
          
          {/* Show if XML has been modified */}
          {xmlContent.includes('CPU') && !imageFile?.name.includes('CPU') && (
            <div className="p-2 bg-primary/10 border border-primary/20 rounded text-xs">
              <div className="flex items-center gap-1 text-primary font-medium mb-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                XML Updated!
              </div>
              <p className="text-muted-foreground">
                Changes made to XML code. To see visual updates, export the modified XML from draw.io or re-upload the updated diagram.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};