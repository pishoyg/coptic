/*
 * IbycusIdNumber.h: ibyIdNumber class --
 *    Class for individual levels in an IbycusId
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

#ifndef	_IBYCUSIDNUMBER_H_
#define _IBYCUSIDNUMBER_H_

#include <string.h>

#include <stdlib.h>

#include "IbycusCit.h"
#include "IbycusFile.h"

__IBYCUS_BEGIN_NAMESPACE
class ibyIdNumber : private ibyCitation
{
public:
	ibyIdNumber() : binary(0), ascii("") {};
	ibyIdNumber(const ibyIdNumber & rhs)
		: binary(rhs.binary), ascii(rhs.ascii) {};
	ibyIdNumber(const int bin, const ibystring_t asc = "")
		{ binary = bin;	ascii = asc; };
	ibyIdNumber(istream & src, unsigned char ch, const ibyIdNumber & prev);
	virtual ~ibyIdNumber() {};

	bool IsTitle() const
		{ return binary == 0 && ascii.compare("t") == 0; };
	void Clear()
		{ binary = 0; ascii.erase(); };
	ibyIdNumber & operator=(const ibyIdNumber & rhs)
		{ binary = rhs.binary; ascii = rhs.ascii; return *this; };
	bool operator!=(const ibyIdNumber & rhs) const
		{ return binary != rhs.binary || ascii != rhs.ascii; };
	bool operator==(const ibyIdNumber & rhs) const
		{ return binary == rhs.binary && ascii == rhs.ascii; };
	bool operator<(const ibyIdNumber & rhs) const;
	bool IsNull() const { return (binary == 0 && ascii.empty()); };
	ibystring_t ToString() const;
	ibystring_t * ToString(ibystring_t * dest);
	unsigned char low_bits(unsigned char ch) const
		{ return ch & LOWBITS; };
	ibystring_t GetAsciiStr(istream & src);


private:
	unsigned int binary;
	ibystring_t ascii;

friend ostream & operator<<(ostream & s, const ibyIdNumber & rhs);
};


__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSIDNUMBER_H_ */
