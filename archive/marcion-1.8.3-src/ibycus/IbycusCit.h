/*
 * IbycusCit.h: ibyCitation class --
 *    Base class for PHI/TLG ID's
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
 * $Revision: 1.2 $
 * $Date: 2001/10/11 19:02:39 $
 * $Author: seanredmond $
 */

#ifndef _IBYCUSCIT_H
#define _IBYCUSCIT_H

#include "IbycusDefs.h"
#define LNIBBLE 0xF0 // 11110000
#define RNIBBLE 0x0F // 00001111
#define LOWBITS 0x7F // 01111111
#define HIGHBIT 0x80 // 10000000



__IBYCUS_BEGIN_NAMESPACE
class ibyCitation
{
public:
	ibyCitation() {};
	virtual ~ibyCitation() {};

protected:

	unsigned char left_nibble(unsigned char ch) const
		{ return ((ch & LNIBBLE) >> 4); };
	unsigned char right_nibble(unsigned char ch) const
		{ return (ch & RNIBBLE); };


	// Possible value for left nibble in an id byte
	enum left_nibble_codes {
		IDX_LN_Z    = 0x08,
		IDX_LN_Y    = 0x09,
		IDX_LN_X    = 0x0A,
		IDX_LN_W    = 0x0B,
		IDX_LN_V    = 0x0C,
		IDX_LN_N    = 0x0D,
		IDX_LN_ESC  = 0x0E,
		IDX_LN_SPEC = 0x0F
	};

	// Possible value for right nibble in an id byte
	enum right_nibble_codes {
		IDX_RN_INC			= 0x00,
		IDX_RN_7BIT			= 0x08,
		IDX_RN_7BIT_CH		= 0x09,
		IDX_RN_7BIT_STR		= 0x0A,
		IDX_RN_14BIT		= 0x0B,
		IDX_RN_14BIT_CH		= 0x0C,
		IDX_RN_14BIT_STR	= 0x0D,
		IDX_RN_NEW_CH		= 0x0E,
		IDX_RN_STR			= 0x0F
	};
};

__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSCIT_H */
