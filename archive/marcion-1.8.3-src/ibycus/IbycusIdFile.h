/*
 * IbycusIdFile.h: ibyIdFile class --
 *    Class for libycus files which contain IbycusId's
 *
 * Copyright (c) 2000  Sean Redmond
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *
 * $Revision: 1.3 $
 * $Date: 2001/10/11 19:02:39 $
 * $Author: seanredmond $
 */

#ifndef _IBYCUSIDFILE_H
#define _IBYCUSIDFILE_H

#include "IbycusFile.h"
#include "IbycusId.h"
//#include "IbycusTxtLine.h"

__IBYCUS_BEGIN_NAMESPACE
class ibyIdFile : public ibyFile
{
public:
	ibyIdFile() : ibyFile() {};
	ibyIdFile(const char *s, ios::openmode mode) : ibyFile(s, mode) {};
	virtual ~ibyIdFile();
	IbycusId last_id;


	enum idt_codes {
		idt_eof			= 0x00,
		idt_new_auth	= 0x01,
		idt_new_work	= 0x02,
		idt_new_sect	= 0x03,
		idt_new_file	= 0x07,
		idt_sect_start	= 0x08,
		idt_sect_end	= 0x09,
		idt_last_id		= 0x0a,
		idt_exc_start	= 0x0b,
		idt_exc_end		= 0x0c,
		idt_exc_sing	= 0x0d,
		idt_desc_ab		= 0x10,
		idt_desc_nz		= 0x11
	};

friend ibyIdFile & operator>>(ibyIdFile & s, IbycusId & rhs);
//friend ibyIdFile & operator>>(ibyIdFile & s, len_string & rhs);
};


__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSIDFILE_H */
