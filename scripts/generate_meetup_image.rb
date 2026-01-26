#!/usr/bin/env ruby
# frozen_string_literal: true

require 'rmagick'

def generate_meetup_image(
  month:,
  year:,
  title:,
  speaker:,
  output_file: nil
)
  output_file ||= "meetup_#{month.downcase}_#{year}.png"
  
  width = 1280
  height = 720
  purple = '#6B2D7B'
  
  # Create canvas
  canvas = Magick::Image.new(width, height) { |img| img.background_color = 'white' }
  draw = Magick::Draw.new
  
  # DotNetDevs.at header
  draw.font_weight = Magick::BoldWeight
  draw.fill = purple
  draw.pointsize = 36
  draw.text(40, 50, 'DotNetDevs.at')
  
  # .NET Meetup Month Year
  draw.pointsize = 56
  draw.gravity = Magick::NorthGravity
  draw.text(0, 80, ".NET Meetup #{month} #{year}")
  
  # Title (main topic) - handle multi-line if title contains colon
  draw.pointsize = 64
  if title.include?(':')
    parts = title.split(':', 2)
    draw.text(0, 180, "#{parts.first}:")
    draw.text(0, 260, parts.last.strip)
  else
    draw.text(0, 220, title)
  end
  
  # Speaker
  draw.pointsize = 40
  draw.text(0, 380, "by #{speaker}")
  
  draw.draw(canvas)
  
  # Draw .NET logo circle (purple)
  circle = Magick::Draw.new
  circle.fill = purple
  circle.circle(width - 120, height - 120, width - 120, height - 240)
  circle.draw(canvas)
  
  # .NET text in circle
  net_text = Magick::Draw.new
  net_text.fill = 'white'
  net_text.pointsize = 48
  net_text.font_weight = Magick::BoldWeight
  net_text.gravity = Magick::CenterGravity
  net_text.annotate(canvas, 200, 100, 380, 200, '.NET')
  
  # Austrian flag stripes (bottom right)
  flag = Magick::Draw.new
  flag_width = 180
  flag_height = 120
  flag_x = width - 200
  flag_y = height - 100
  
  # Red stripe top
  flag.fill = '#ED2939'
  flag.rectangle(flag_x, flag_y, flag_x + flag_width, flag_y + 40)
  # White stripe middle
  flag.fill = 'white'
  flag.rectangle(flag_x, flag_y + 40, flag_x + flag_width, flag_y + 80)
  # Red stripe bottom
  flag.fill = '#ED2939'
  flag.rectangle(flag_x, flag_y + 80, flag_x + flag_width, flag_y + 120)
  flag.draw(canvas)
  
  canvas.write(output_file)
  puts "Generated: #{output_file}"
  output_file
end

# Example usage when run directly
if __FILE__ == $PROGRAM_NAME
  generate_meetup_image(
    month: 'January',
    year: 2026,
    title: 'DevContainers: Development environments as code',
    speaker: 'Alex Thissen'
  )
end
