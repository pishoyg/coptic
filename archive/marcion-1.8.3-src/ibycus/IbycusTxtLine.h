/*
 * IbycusTxtLine.h: ibyTxtLine class --
 *    A line (ibycusIdt + ibystring_t) in an IbycusTxtFile
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

#ifndef	_IBYCUSTXTLINE_H_
#define _IBYCUSTXTLINE_H_

#include "IbycusDefs.h"
#include "IbycusIdFile.h"

__IBYCUS_BEGIN_NAMESPACE
class ibyTxtLine
{
public:
	ibyTxtLine(): Text_("") {};
	ibyTxtLine(ibyIdFile & src);
	virtual ~ibyTxtLine() {};
	void Clear();
	void Read(ibyIdFile & p_src);
	const ibystring_t & Text() const
		{ return Text_; };
	const IbycusId & Id() const
		{ return Id_; };
    bool operator<(const ibyTxtLine & rhs) const
		{ return Id_ < rhs.Id_; };
    bool operator==(const ibyTxtLine & rhs) const
		{ return Id_ == rhs.Id_; };

private:
	ibystring_t Text_;
	IbycusId Id_;
};



__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSTXTLINE_H_ */
