import jsPDF from 'jspdf';

// Import autoTable function and apply it to jsPDF prototype
import autoTable from 'jspdf-autotable';

// Apply autoTable to jsPDF prototype
jsPDF.autoTable = autoTable;

// Helper function to format dates
const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return withTime
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString();
};

// Helper function to normalize IDs
const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return String(value);
};

export const generateBookingReport = async (bookings, vehiclesMap, filterType = 'all') => {
  try {
    // Create PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    // Add title and header
    pdf.setFontSize(20);
    pdf.setTextColor(33, 53, 85); // #213555
    pdf.text('BOOKING MANAGEMENT REPORT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Add report details
    pdf.setFontSize(10);
    pdf.setTextColor(62, 88, 121); // #3E5879
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
    pdf.text(`Filter: ${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Bookings`, 20, yPosition + 5);
    pdf.text(`Total Bookings: ${bookings.length}`, 20, yPosition + 10);
    yPosition += 20;

    // Add summary section
    if (bookings.length > 0) {
      // Calculate summary statistics
      const statusCounts = {};
      bookings.forEach(booking => {
        statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
      });

      pdf.setFontSize(12);
      pdf.setTextColor(33, 53, 85);
      pdf.text('SUMMARY STATISTICS', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(9);
      pdf.setTextColor(62, 88, 121);
      let statY = yPosition;
      Object.entries(statusCounts).forEach(([status, count], index) => {
        const xPos = 20 + (index % 2) * 90;
        const yPos = statY + Math.floor(index / 2) * 5;
        pdf.text(`${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`, xPos, yPos);
      });
      
      yPosition += Math.ceil(Object.keys(statusCounts).length / 2) * 5 + 10;
    }

    // Add sample booking data in a table
    const sampleData = [
      ['Japan Car', 'NWP-5265', '10/15/2025 14:00', '10/16/2025 17:23', 'Confirmed']
    ];

    pdf.setFontSize(12);
    pdf.setTextColor(33, 53, 85);
    pdf.text('SAMPLE BOOKING DATA', 20, yPosition);
    yPosition += 8;

    // Use autoTable function directly
    autoTable(pdf, {
      startY: yPosition,
      head: [['Vehicle', 'License Plate', 'Pickup Date/Time', 'Return Date/Time', 'Status']],
      body: sampleData,
      theme: 'grid',
      headStyles: {
        fillColor: [33, 53, 85], // #213555
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      margin: { left: 20, right: 20 }
    });

    yPosition = pdf.lastAutoTable.finalY + 15;

    // Add actual bookings in a detailed table
    if (bookings.length > 0) {
      pdf.setFontSize(12);
      pdf.setTextColor(33, 53, 85);
      pdf.text('BOOKING DETAILS', 20, yPosition);
      yPosition += 8;

      // Prepare table data
      const tableData = bookings.map((booking, index) => {
        const vehicleId = normalizeId(booking.vehicleId);
        const vehicle = vehiclesMap[vehicleId];
        const vehicleLabel = [vehicle?.basicInfo?.make, vehicle?.basicInfo?.model]
          .filter(value => typeof value === 'string' && value.trim())
          .join(' ') || 'Unknown Vehicle';
        
        const licensePlate = vehicle?.basicInfo?.licensePlate || 'N/A';
        const pickupDate = formatDate(booking.bookingDetails?.startDate, true);
        const dropoffDate = formatDate(booking.bookingDetails?.endDate, true);
        
        return [
          (index + 1).toString(),
          vehicleLabel,
          vehicle?.basicInfo?.year || 'N/A',
          licensePlate,
          pickupDate,
          dropoffDate,
          booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
          booking._id || 'N/A'
        ];
      });

      // Create main bookings table
      autoTable(pdf, {
        startY: yPosition,
        head: [
          ['#', 'Vehicle', 'Year', 'License Plate', 'Pickup Date/Time', 'Return Date/Time', 'Status', 'Booking ID']
        ],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [62, 88, 121], // #3E5879
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Light gray for alternate rows
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: 'linebreak',
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 8 },  // #
          1: { cellWidth: 30 }, // Vehicle
          2: { cellWidth: 15 }, // Year
          3: { cellWidth: 25 }, // License Plate
          4: { cellWidth: 30 }, // Pickup
          5: { cellWidth: 30 }, // Return
          6: { cellWidth: 20 }, // Status
          7: { cellWidth: 25 }  // Booking ID
        },
        margin: { left: 15, right: 15 },
        didDrawPage: function (data) {
          // Add page numbers
          const pageCount = pdf.internal.getNumberOfPages();
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
        }
      });

      // Add detailed information after the table
      const finalY = pdf.lastAutoTable.finalY + 10;
      
      if (finalY < 250) {
        pdf.setFontSize(10);
        pdf.setTextColor(33, 53, 85);
        pdf.text('REPORT INFORMATION', 20, finalY);
        
        pdf.setFontSize(8);
        pdf.setTextColor(62, 88, 121);
        pdf.text(`• Report generated by: RentXpress Vehicle Management System`, 25, finalY + 6);
        pdf.text(`• Total records: ${bookings.length} bookings`, 25, finalY + 12);
        pdf.text(`• Filter applied: ${filterType} bookings`, 25, finalY + 18);
        pdf.text(`• Generation timestamp: ${new Date().toLocaleString()}`, 25, finalY + 24);
      }
    } else {
      pdf.setFontSize(12);
      pdf.setTextColor(62, 88, 121);
      pdf.text('No bookings available in this view.', 20, yPosition);
    }

    // Add footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Confidential - RentXpress Booking Management System', pageWidth / 2, pdf.internal.pageSize.getHeight() - 5, { align: 'center' });
    }

    // Save the PDF
    pdf.save(`booking-report-${filterType}-${new Date().toISOString().split('T')[0]}.pdf`);
    
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw new Error('Failed to generate PDF report. Please try again.');
  }
};