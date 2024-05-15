/*
 * IbycusIdtSection.h: ibyIdtSection class --
 *    Section in an ibycusIdtWork
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
 * $Revision: 1.5 $
 * $Date: 2001/10/11 21:52:16 $
 * $Author: seanredmond $
 */

#ifndef	_IBYCUSIDTSECTION_H_
#define _IBYCUSIDTSECTION_H_

#include "IbycusFile.h"
#include "IbycusId.h"
#include "IbycusIdFile.h"
#include "IbycusIdException.h"
#include "IbycusParseException.h"
#include "IbycusNoId.h"

__IBYCUS_BEGIN_NAMESPACE
class ibyIdtSection
{

public:
	ibyIdtSection() : Block_(0) {};
	ibyIdtSection(ibyIdFile & idt);
	virtual ~ibyIdtSection() {};
        bool operator<(const ibyIdtSection & rhs) const
		{ return StartId_ < rhs.StartId_; };
        bool operator==(const ibyIdtSection & rhs) const
		{ return StartId_ == rhs.StartId_ && EndId_ < rhs.EndId_; };
        const IbycusId & Start() const{
            cout << "Section Start: " << StartId_ << "\n";
            return StartId_;}
        const IbycusId & End() const{
            return EndId_;}
	ibylen_t Block(const IbycusId & id) const throw(IbycusNoId);
	int Span() const
		{ return LastIds_.size(); };

private:
	ibylen_t Block_;
	IbycusId StartId_, EndId_;
	vector<IbycusId> LastIds_;
	vector<ibyIdException> Exceptions_;
};


__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSIDTSECTION_H_ */
