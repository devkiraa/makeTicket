from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

def create_logo():
    # Google recommends 120x120px
    size = (120, 120)
    
    # Create a new image with a transparent background
    # Using RGBA for transparency support
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Background: Rounded Rectangle with Gradient-like fill (solid for simplicity/clarity at this size)
    # Google logos look best with simple, bold backgrounds
    bg_color = (79, 70, 229, 255) # Indigo-600 similar to your app theme
    
    # Draw rounded rectangle background
    padding = 5
    x0, y0 = padding, padding
    x1, y1 = size[0] - padding, size[1] - padding
    radius = 25
    
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=bg_color)
    
    # 2. Draw a "Ticket" Icon shape in the center
    # Ticket body
    ticket_w = 60
    ticket_h = 40
    tx0 = (size[0] - ticket_w) // 2
    ty0 = (size[1] - ticket_h) // 2
    tx1 = tx0 + ticket_w
    ty1 = ty0 + ticket_h
    
    ticket_color = (255, 255, 255, 255) # White
    
    # We draw a rectangle, then cut out circles from the sides to make it look like a ticket
    draw.rectangle([tx0, ty0, tx1, ty1], fill=ticket_color)
    
    # Cutouts (circles)
    cutout_radius = 8
    # Left cutout
    draw.ellipse([tx0 - cutout_radius, ty0 + (ticket_h//2) - cutout_radius, 
                  tx0 + cutout_radius, ty0 + (ticket_h//2) + cutout_radius], fill=bg_color)
    # Right cutout
    draw.ellipse([tx1 - cutout_radius, ty0 + (ticket_h//2) - cutout_radius, 
                  tx1 + cutout_radius, ty0 + (ticket_h//2) + cutout_radius], fill=bg_color)
    
    # 3. Add Initials "G"
    # Note: Since we are drawing shapes, we could try to load a font, 
    # but drawing a simple path is safer if user lacks fonts.
    # Let's draw a simple "G" text centered if possible, fallback to shape if needed.
    # We will try to rely on default font or simple shape drawing.
    
    try:
        # Try to use a nice sans-serif font if available
        font = ImageFont.truetype("arial.ttf", 30)
    except IOError:
        # Fallback to default
        font = ImageFont.load_default()

    # Draw "G" inside the ticket? No, typically icons are abstract. 
    # Let's put a "Check" mark or just leave the ticket blank for cleaner look.
    # Let's add a dashed line across the ticket for detail.
    line_x = tx0 + 18
    draw.line([line_x, ty0+5, line_x, ty1-5], fill=bg_color, width=2)
    
    # Save the file
    output_path = 'google_app_logo_120x120.png'
    img.save(output_path, 'PNG')
    print(f"✅ Logo generated successfully: {os.path.abspath(output_path)}")
    print("This file conforms to Google's requirement: Square, 120x120px, PNG format.")

if __name__ == "__main__":
    create_logo()
