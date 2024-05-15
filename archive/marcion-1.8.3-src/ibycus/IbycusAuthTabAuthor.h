/*
 * IbycusAuthTabAuthor.h: ibyAuthTabAuthor class --
 *    Author in a TLG/PHI AUTHTAB.DIR
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
 * $Revision: 1.4 $
 * $Date: 2001/11/12 18:41:11 $
 * $Author: seanredmond $
*/

#ifndef	_IBYCUSAUTHTABAUTHOR_H_
#define _IBYCUSAUTHTABAUTHOR_H_

#include "IbycusDefs.h"
#include "IbycusException.h"
#include <vector>
using namespace std;


__IBYCUS_BEGIN_NAMESPACE

class ibyAuthTabAuthor
{
public:
	ibyAuthTabAuthor() {};
	ibyAuthTabAuthor(ibystring_t & c_id, ibystring_t & c_name)
		: id_(c_id), name_(alphabetize(c_name)) {};
	virtual ~ibyAuthTabAuthor() {};
	const ibystring_t & Name() const
		{ return name_; };
	const ibystring_t & Comment() const
		{ return comment_; };
	const ibystring_t & Id() const
		{ return id_; };
	const ibychar_t Alphabet() const
		{ return alpha_; };
	int AliasCount() const
		{ return aliases_.size(); };
	const ibystring_t & Alias(int alias) const throw(IbycusException);
	void AddAlias(ibystring_t & alias)
		{ aliases_.push_back(alias); };
	void SetAlphabet(ibychar_t alpha)
		{ alpha_ = alpha; };
	void SetComment(const ibystring_t & cmnt)
		{ comment_ = cmnt; };
	bool operator<(const ibyAuthTabAuthor & rhs) const
		{ return id_ < rhs.id_; };
	bool operator==(const ibyAuthTabAuthor & rhs) const
		{ return id_ == rhs.id_; };

private:
	ibystring_t alphabetize(ibystring_t & src);

	ibystring_t id_;
	ibystring_t name_;
	ibychar_t alpha_;
	ibystring_t comment_;
	vector<ibystring_t> aliases_;

};

__IBYCUS_END_NAMESPACE

#endif	/* Not _IBYCUSAUTHTABAUTHOR_H_ */
