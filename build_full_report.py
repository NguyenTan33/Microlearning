import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from report_sections_part1 import add_part1
from report_sections_part2 import add_part2
from report_sections_part3 import add_part3

def generate_full_report(output_filename="Bao_Cao_Du_An_Microlearning.docx"):
    print("Initializing Word Document (.docx)...")
    doc = docx.Document()
    
    # Cấu hình lề trang chuẩn 1 inch (2.54 cm)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
        # Cấu hình Header
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("MICROLEARNING - BÁO CÁO TOÀN DIỆN KIẾN TRÚC & PHÁT TRIỂN HỆ THỐNG")
        hrun.font.name = 'Calibri'
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(156, 163, 175)
        
        # Cấu hình Footer
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Tài liệu kỹ thuật tổng quan dành cho Quản lý cấp cao & Đội ngũ Kỹ sư | Microlearning Project 2026")
        frun.font.name = 'Calibri'
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(156, 163, 175)

    # Cấu hình Normal style font
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(10.5)
    font.color.rgb = RGBColor(31, 41, 55)

    print("Building Part 1 (Overview, Project structure & 24 DB tables)...")
    add_part1(doc)
    
    print("Building Part 2 (Backend .NET 8 services, React Web & Expo Mobile)...")
    add_part2(doc)
    
    print("Building Part 3 (Roadmap, Security, Deployment & Conclusion)...")
    add_part3(doc)
    
    print(f"Saving document to {output_filename}...")
    doc.save(output_filename)
    print("SUCCESS: Full report created successfully!")

if __name__ == "__main__":
    generate_full_report()
