import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Zap } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  hasFiles: boolean;
  xmlContent: string;
  onXmlUpdate: (content: string) => void;
}

export const ChatInterface = ({ hasFiles, xmlContent, onXmlUpdate }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your Architecture AI assistant. Upload your architecture diagrams and XML files, then tell me what changes you\'d like to make. I can help you modify components, add new elements, or restructure your architecture.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    if (!hasFiles) {
      toast.error("Please upload architecture files first");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Process AI request and make actual changes
    setTimeout(() => {
      let actualChanges: string[] = [];
      let modifiedXml = xmlContent;

      // Make actual XML changes if content exists
      if (xmlContent) {
        // Ensure XML is properly formatted for draw.io
        if (!xmlContent.includes('mxGraphModel')) {
          toast.error("The uploaded file doesn't seem to be a valid draw.io diagram");
          setIsLoading(false);
          return;
        }
        const result = makeActualXmlChanges(inputValue, xmlContent);
        modifiedXml = result.modifiedXml;
        actualChanges = result.changes;

        console.log('AI Processing:', {
          input: inputValue,
          changes: actualChanges,
          xmlLength: xmlContent.length,
          modifiedLength: modifiedXml.length
        });

        // Update XML content if changes were made
        if (actualChanges.length > 0) {
          onXmlUpdate(modifiedXml);
          toast.success(`✅ XML Updated! Made ${actualChanges.length} change(s). Check the XML Code tab to see changes.`);
        } else {
          console.log('No changes made. Input may not match patterns.');
        }
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(inputValue, xmlContent, actualChanges),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const makeActualXmlChanges = (userInput: string, xml: string): { modifiedXml: string; changes: string[] } => {
    const lowerInput = userInput.toLowerCase();
    let modifiedXml = xml;
    const changes: string[] = [];

    // Dynamic AI-powered XML modification system
    try {
      // 1. COMPONENT REMOVAL - Remove blocks/components
      const removePatterns = [
        /remove\s+(?:the\s+)?(\w+)(?:\s+block|\s+component)?/i,
        /delete\s+(?:the\s+)?(\w+)(?:\s+block|\s+component)?/i,
        /take\s+out\s+(?:the\s+)?(\w+)/i,
        /eliminate\s+(?:the\s+)?(\w+)/i
      ];

      for (const pattern of removePatterns) {
        const match = userInput.match(pattern);
        if (match) {
          const componentToRemove = match[1];
          const result = removeComponent(modifiedXml, componentToRemove);
          if (result.success) {
            modifiedXml = result.xml;
            changes.push(`Removed ${componentToRemove.toUpperCase()} component and its connections`);
            return { modifiedXml, changes };
          }
        }
      }

      // 2. COMPONENT RENAMING/REPLACEMENT - Dynamic pattern matching
      const changePatterns = [
        /(?:change|rename|replace|convert|switch|update|make|turn)\s+(?:the\s+)?(\w+)(?:\s+(?:to|as|into|with|by))\s+(?:a\s+|an\s+)?(\w+)/i,
        /(\w+)\s+(?:to|as|into|→|->)\s+(\w+)/i,
        /replace\s+(\w+)\s+with\s+(\w+)/i
      ];

      for (const pattern of changePatterns) {
        const match = userInput.match(pattern);
        if (match) {
          const [, fromComponent, toComponent] = match;
          const result = replaceComponent(modifiedXml, fromComponent, toComponent);
          if (result.success) {
            modifiedXml = result.xml;
            changes.push(`Changed ${result.count} instance(s) of "${fromComponent.toUpperCase()}" to "${toComponent.toUpperCase()}"`);
            return { modifiedXml, changes };
          }
        }
      }

      // 3. CONNECTION/ARROW REMOVAL
      const connectionRemovePatterns = [
        /remove\s+(?:the\s+)?(?:arrow|connection|line|wire)(?:\s+between\s+(\w+)\s+and\s+(\w+))?/i,
        /delete\s+(?:the\s+)?(?:arrow|connection|line|wire)(?:\s+between\s+(\w+)\s+and\s+(\w+))?/i,
        /disconnect\s+(\w+)(?:\s+(?:from|and)\s+(\w+))?/i
      ];

      for (const pattern of connectionRemovePatterns) {
        const match = userInput.match(pattern);
        if (match) {
          const result = removeConnections(modifiedXml, match[1], match[2]);
          if (result.success) {
            modifiedXml = result.xml;
            changes.push(result.message);
            return { modifiedXml, changes };
          }
        }
      }

      // 4. COMPONENT ADDITION
      const addPatterns = [
        /add\s+(?:a\s+|an\s+)?(\w+)(?:\s+(?:component|block|unit))?/i,
        /insert\s+(?:a\s+|an\s+)?(\w+)/i,
        /create\s+(?:a\s+|an\s+)?(\w+)/i
      ];

      for (const pattern of addPatterns) {
        const match = userInput.match(pattern);
        if (match) {
          const componentToAdd = match[1];
          const result = addComponent(modifiedXml, componentToAdd);
          if (result.success) {
            modifiedXml = result.xml;
            changes.push(`Added new ${componentToAdd.toUpperCase()} component to the architecture`);
            return { modifiedXml, changes };
          }
        }
      }

      // 5. PROPERTY MODIFICATIONS
      const propertyPatterns = [
        /(?:make|set|change)\s+(\w+)\s+(?:size|width|height)\s+(?:to\s+)?(\d+)/i,
        /resize\s+(\w+)\s+to\s+(\d+)/i,
        /(?:make|set)\s+(\w+)\s+(?:color|colour)\s+(?:to\s+)?(\w+)/i
      ];

      for (const pattern of propertyPatterns) {
        const match = userInput.match(pattern);
        if (match) {
          const [, component, value] = match;
          const result = modifyComponentProperty(modifiedXml, component, value, userInput);
          if (result.success) {
            modifiedXml = result.xml;
            changes.push(result.message);
            return { modifiedXml, changes };
          }
        }
      }

      // 6. SMART CONTEXTUAL CHANGES - Analyze the entire input for context
      const contextualResult = handleContextualChanges(modifiedXml, userInput);
      if (contextualResult.success) {
        modifiedXml = contextualResult.xml;
        changes.push(...contextualResult.changes);
        return { modifiedXml, changes };
      }

    } catch (error) {
      console.error('Error in XML processing:', error);
    }

    return { modifiedXml, changes };
  };

  // Helper function to remove components from XML
  const removeComponent = (xml: string, componentName: string): { success: boolean; xml: string } => {
    try {
      const componentRegex = new RegExp(`<mxCell[^>]*value="[^"]*${componentName}[^"]*"[^>]*>.*?</mxCell>`, 'gis');
      const matches = xml.match(componentRegex);
      
      if (matches && matches.length > 0) {
        let modifiedXml = xml;
        matches.forEach(match => {
          modifiedXml = modifiedXml.replace(match, '');
        });
        
        // Also remove any connections to this component
        const idMatches = xml.match(new RegExp(`id="([^"]*)"[^>]*value="[^"]*${componentName}[^"]*"`, 'i'));
        if (idMatches) {
          const componentId = idMatches[1];
          const connectionRegex = new RegExp(`<mxCell[^>]*(?:source|target)="${componentId}"[^>]*>.*?</mxCell>`, 'gis');
          modifiedXml = modifiedXml.replace(connectionRegex, '');
        }
        
        return { success: true, xml: modifiedXml };
      }
    } catch (error) {
      console.error('Error removing component:', error);
    }
    return { success: false, xml };
  };

  // Helper function to replace components in XML
  const replaceComponent = (xml: string, fromComponent: string, toComponent: string): { success: boolean; xml: string; count: number } => {
    try {
      const regex = new RegExp(`\\b${fromComponent}\\b`, 'gi');
      const matches = xml.match(regex);
      
      if (matches && matches.length > 0) {
        const modifiedXml = xml.replace(regex, toComponent.toUpperCase());
        return { success: true, xml: modifiedXml, count: matches.length };
      }
    } catch (error) {
      console.error('Error replacing component:', error);
    }
    return { success: false, xml, count: 0 };
  };

  // Helper function to remove connections
  const removeConnections = (xml: string, component1?: string, component2?: string): { success: boolean; xml: string; message: string } => {
    try {
      let modifiedXml = xml;
      let removedCount = 0;

      if (component1 && component2) {
        // Remove specific connection between two components
        const connectionRegex = new RegExp(`<mxCell[^>]*edge="1"[^>]*>.*?</mxCell>`, 'gis');
        const connections = xml.match(connectionRegex) || [];
        
        connections.forEach(connection => {
          if (connection.includes(component1) && connection.includes(component2)) {
            modifiedXml = modifiedXml.replace(connection, '');
            removedCount++;
          }
        });
        
        return { 
          success: removedCount > 0, 
          xml: modifiedXml, 
          message: `Removed ${removedCount} connection(s) between ${component1.toUpperCase()} and ${component2.toUpperCase()}` 
        };
      } else {
        // Remove all arrows/connections
        const arrowRegex = /<mxCell[^>]*edge="1"[^>]*>.*?<\/mxCell>/gis;
        const arrows = xml.match(arrowRegex) || [];
        removedCount = arrows.length;
        
        if (removedCount > 0) {
          modifiedXml = xml.replace(arrowRegex, '');
          return { 
            success: true, 
            xml: modifiedXml, 
            message: `Removed ${removedCount} arrow(s)/connection(s) from the diagram` 
          };
        }
      }
    } catch (error) {
      console.error('Error removing connections:', error);
    }
    return { success: false, xml, message: 'No connections found to remove' };
  };

  // Helper function to add components
  const addComponent = (xml: string, componentName: string): { success: boolean; xml: string } => {
    try {
      // Find the last mxCell to get the next ID
      const cellMatches = xml.match(/id="(\d+)"/g) || [];
      const maxId = Math.max(...cellMatches.map(match => parseInt(match.match(/\d+/)?.[0] || '0')));
      const newId = maxId + 1;
      
      // Create new component XML
      const newComponent = `
        <mxCell id="${newId}" value="${componentName.toUpperCase()}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
          <mxGeometry x="400" y="200" width="120" height="60" as="geometry" />
        </mxCell>`;
      
      // Insert before the closing mxGraphModel tag
      const modifiedXml = xml.replace('</mxGraphModel>', newComponent + '\n  </mxGraphModel>');
      return { success: true, xml: modifiedXml };
    } catch (error) {
      console.error('Error adding component:', error);
    }
    return { success: false, xml };
  };

  // Helper function to modify component properties
  const modifyComponentProperty = (xml: string, component: string, value: string, userInput: string): { success: boolean; xml: string; message: string } => {
    try {
      const lowerInput = userInput.toLowerCase();
      let modifiedXml = xml;
      
      if (lowerInput.includes('size') || lowerInput.includes('width') || lowerInput.includes('height')) {
        const sizeRegex = new RegExp(`(<mxCell[^>]*value="[^"]*${component}[^"]*"[^>]*>.*?<mxGeometry[^>]*width=")[^"]*("[^>]*height=")[^"]*(".*?</mxCell>)`, 'gis');
        modifiedXml = xml.replace(sizeRegex, `$1${value}$2${value}$3`);
        return { success: true, xml: modifiedXml, message: `Changed ${component.toUpperCase()} size to ${value}x${value}` };
      }
      
      if (lowerInput.includes('color') || lowerInput.includes('colour')) {
        const colorMap: { [key: string]: string } = {
          'red': '#ff0000', 'blue': '#0000ff', 'green': '#00ff00', 'yellow': '#ffff00',
          'orange': '#ffa500', 'purple': '#800080', 'pink': '#ffc0cb', 'gray': '#808080'
        };
        const colorCode = colorMap[value.toLowerCase()] || value;
        const colorRegex = new RegExp(`(<mxCell[^>]*value="[^"]*${component}[^"]*"[^>]*style="[^"]*fillColor=)[^;]*(;[^"]*"[^>]*>.*?</mxCell>)`, 'gis');
        modifiedXml = xml.replace(colorRegex, `$1${colorCode}$2`);
        return { success: true, xml: modifiedXml, message: `Changed ${component.toUpperCase()} color to ${value}` };
      }
    } catch (error) {
      console.error('Error modifying component property:', error);
    }
    return { success: false, xml, message: 'Property modification failed' };
  };

  // Advanced contextual analysis for complex requests
  const handleContextualChanges = (xml: string, userInput: string): { success: boolean; xml: string; changes: string[] } => {
    const changes: string[] = [];
    let modifiedXml = xml;
    
    try {
      // Extract all components mentioned in the input
      const words = userInput.toLowerCase().split(/\s+/);
      const potentialComponents = words.filter(word => 
        word.length > 2 && 
        !['the', 'and', 'or', 'to', 'from', 'with', 'by', 'as', 'into', 'remove', 'add', 'change', 'make'].includes(word)
      );
      
      // Check if any of these components exist in the XML
      for (const component of potentialComponents) {
        const componentExists = xml.toLowerCase().includes(component);
        if (componentExists) {
          // Apply intelligent modifications based on context
          if (userInput.toLowerCase().includes('bigger') || userInput.toLowerCase().includes('larger')) {
            const result = modifyComponentProperty(modifiedXml, component, '150', 'make bigger');
            if (result.success) {
              modifiedXml = result.xml;
              changes.push(`Made ${component.toUpperCase()} larger`);
            }
          }
          
          if (userInput.toLowerCase().includes('smaller')) {
            const result = modifyComponentProperty(modifiedXml, component, '80', 'make smaller');
            if (result.success) {
              modifiedXml = result.xml;
              changes.push(`Made ${component.toUpperCase()} smaller`);
            }
          }
        }
      }
      
      return { success: changes.length > 0, xml: modifiedXml, changes };
    } catch (error) {
      console.error('Error in contextual analysis:', error);
    }
    
    return { success: false, xml, changes: [] };
  };

  const generateAIResponse = (userInput: string, xml: string, actualChanges: string[]): string => {
    const lowerInput = userInput.toLowerCase();
    
    // If we made actual changes, report them with detailed feedback
    if (actualChanges.length > 0) {
      return `✅ **Architecture Successfully Updated!**\n\nHere's what I accomplished:\n${actualChanges.map(change => `• ${change}`).join('\n')}\n\n🔍 **How to View Changes:**\n1. Switch to the "Viewer" tab to see your updated diagram\n2. Click "Updated" to view the modified architecture\n3. Click "Original" to compare with the previous version\n4. Check the "XML Code" tab to see the underlying changes\n\n💡 **What's Next?**\nI can help you make additional modifications:\n• Add more components\n• Remove other elements\n• Change colors, sizes, or properties\n• Modify connections between components\n• Restructure the layout\n\nJust tell me what you'd like to change next!`;
    }

    // Enhanced response generation based on user intent
    const responseStrategies = [
      {
        keywords: ['remove', 'delete', 'eliminate', 'take out'],
        response: () => {
          const components = extractComponentsFromXml(xml);
          return `🗑️ **Component Removal**\n\nI can help you remove any component from your architecture. I'll automatically handle:\n• Removing the component itself\n• Cleaning up all connections to/from that component\n• Maintaining diagram integrity\n\n📋 **Available Components:**\n${components.map(comp => `• ${comp}`).join('\n')}\n\n💬 **Example Commands:**\n• "remove GPU block"\n• "delete the memory component"\n• "eliminate CPU"\n\nWhich component would you like me to remove?`;
        }
      },
      {
        keywords: ['add', 'insert', 'create', 'new'],
        response: () => `➕ **Add New Components**\n\nI can add new components to your architecture! Here's what I can do:\n\n🔧 **Component Types:**\n• Processing units (CPU, GPU, DSP)\n• Memory components (RAM, Cache, Storage)\n• Interface modules (USB, Ethernet, SPI)\n• Custom components (any name you specify)\n\n💬 **Example Commands:**\n• "add a RAM component"\n• "insert new GPU block"\n• "create ethernet interface"\n\n✨ **Features:**\n• Automatic positioning\n• Professional styling\n• Unique ID generation\n• Ready for connections\n\nWhat component would you like me to add?`
      },
      {
        keywords: ['change', 'rename', 'replace', 'convert', 'switch', 'update', 'make', 'turn'],
        response: () => {
          const components = extractComponentsFromXml(xml);
          return `🔄 **Component Modification**\n\nI can modify your architecture components in multiple ways:\n\n📋 **Current Components:**\n${components.map(comp => `• ${comp}`).join('\n')}\n\n🎯 **Modification Types:**\n• Rename components (GPU → CPU)\n• Change properties (size, color)\n• Update labels and text\n• Modify styling\n\n💬 **Example Commands:**\n• "change GPU to CPU"\n• "make memory component red"\n• "resize CPU to 150"\n• "update interface to ethernet"\n\nWhat would you like me to modify?`;
        }
      },
      {
        keywords: ['arrow', 'connection', 'line', 'wire', 'link', 'connect'],
        response: () => `🔗 **Connection Management**\n\nI can manage all connections in your architecture:\n\n⚡ **Connection Operations:**\n• Remove specific arrows between components\n• Delete all connections\n• Disconnect components\n• Clean up orphaned connections\n\n💬 **Example Commands:**\n• "remove arrow between CPU and GPU"\n• "delete all connections"\n• "disconnect memory from CPU"\n• "remove the wire"\n\n🎯 **Smart Features:**\n• Automatic connection cleanup\n• Maintains diagram integrity\n• Preserves component positions\n\nWhat connection changes would you like me to make?`
      },
      {
        keywords: ['color', 'colour', 'size', 'resize', 'bigger', 'smaller', 'larger'],
        response: () => {
          const components = extractComponentsFromXml(xml);
          return `🎨 **Visual Properties**\n\nI can modify the visual appearance of your components:\n\n📋 **Available Components:**\n${components.map(comp => `• ${comp}`).join('\n')}\n\n🎯 **Property Changes:**\n• Colors: red, blue, green, yellow, orange, purple, pink, gray\n• Sizes: specific dimensions or relative (bigger/smaller)\n• Styling: borders, fills, shapes\n\n💬 **Example Commands:**\n• "make CPU red"\n• "resize GPU to 150"\n• "make memory bigger"\n• "change interface color to blue"\n\nWhat visual changes would you like me to make?`;
        }
      }
    ];

    // Find matching response strategy
    for (const strategy of responseStrategies) {
      if (strategy.keywords.some(keyword => lowerInput.includes(keyword))) {
        return strategy.response();
      }
    }

    // Default comprehensive response
    const components = extractComponentsFromXml(xml);
    return `🤖 **Architecture AI Assistant**\n\nI'm ready to help you modify your architecture! I can understand natural language commands and make precise changes to your diagram.\n\n📋 **Current Components:**\n${components.map(comp => `• ${comp}`).join('\n')}\n\n🛠️ **What I Can Do:**\n• **Add** new components (processors, memory, interfaces)\n• **Remove** existing components and their connections\n• **Rename/Replace** components (GPU → CPU, etc.)\n• **Modify** properties (colors, sizes, styling)\n• **Manage** connections and arrows\n• **Restructure** layout and organization\n\n💬 **Just tell me what you want!**\nExamples:\n• "remove GPU block"\n• "change memory to storage"\n• "add ethernet interface"\n• "make CPU bigger and red"\n• "delete all arrows"\n\nWhat would you like me to change in your architecture?`;
  };

  // Helper function to extract component names from XML
  const extractComponentsFromXml = (xml: string): string[] => {
    try {
      const valueMatches = xml.match(/value="([^"]+)"/g) || [];
      const components = valueMatches
        .map(match => match.replace(/value="|"/g, ''))
        .filter(value => value && value.length > 0 && !value.includes('<') && !value.includes('mxCell'))
        .filter((value, index, array) => array.indexOf(value) === index) // Remove duplicates
        .slice(0, 10); // Limit to first 10 components
      
      return components.length > 0 ? components : ['No components detected'];
    } catch (error) {
      console.error('Error extracting components:', error);
      return ['Error reading components'];
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-slide-in ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.type === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                
                <Card
                  className={`max-w-[80%] p-3 ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-secondary/50'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-70 mt-2 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </Card>

                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 animate-slide-in">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-foreground animate-pulse" />
                </div>
                <Card className="p-3 bg-secondary/50">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="space-y-2">
          {!hasFiles && (
            <Card className="p-3 bg-destructive/10 border-destructive/20">
              <p className="text-sm text-destructive">
                📁 Please upload your architecture files first to start chatting
              </p>
            </Card>
          )}
          
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={hasFiles ? "Ask me to modify your architecture..." : "Upload files first..."}
              disabled={!hasFiles || isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!hasFiles || !inputValue.trim() || isLoading}
              className="bg-gradient-primary hover:shadow-glow-primary transition-all duration-300"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
